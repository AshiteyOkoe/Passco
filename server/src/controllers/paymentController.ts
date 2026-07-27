import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';
import crypto from 'crypto';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE = 'https://api.paystack.co';

async function paystackRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res.json();
}

export async function initializePayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { plan, email } = req.body;
    if (!plan || !['basic', 'premium'].includes(plan)) {
      res.status(400).json({ message: 'Invalid plan' }); return;
    }

    const amounts: Record<string, number> = { basic: 2900, premium: 5900 };
    const amount = amounts[plan];

    const callback_url = `${process.env.CLIENT_URL || 'https://selfexamine.vercel.app'}/subscription?payment=success`;

    const payload = JSON.stringify({
      email,
      amount: amount * 100,
      currency: 'GHS',
      callback_url,
      metadata: { user_id: req.user!.id, plan },
    });

    const result = await paystackRequest('/transaction/initialize', {
      method: 'POST',
      body: payload,
    });

    if (!result.status) {
      res.status(400).json({ message: result.message || 'Payment initialization failed' }); return;
    }

    await supabase.from('payments').insert({
      user_id: req.user!.id,
      amount,
      currency: 'GHS',
      provider: 'paystack',
      provider_ref: result.data?.reference || '',
      status: 'pending',
      plan,
      metadata: result.data,
    });

    res.json({
      authorization_url: result.data?.authorization_url,
      reference: result.data?.reference,
      access_code: result.data?.access_code,
    });
  } catch (error) {
    console.error('Initialize payment error:', error);
    res.status(500).json({ message: 'Payment initialization failed' });
  }
}

export async function verifyPayment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { reference } = req.params;
    if (!reference) { res.status(400).json({ message: 'Reference required' }); return; }

    const result = await paystackRequest(`/transaction/verify/${reference}`);
    if (!result.status || result.data?.status !== 'success') {
      res.status(400).json({ message: 'Payment not verified', status: result.data?.status }); return;
    }

    const metadata = result.data?.metadata;
    const userId = metadata?.user_id || req.user!.id;
    const plan = metadata?.plan;

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('provider_ref', reference)
      .maybeSingle();

    if (existingPayment?.status === 'success') {
      res.json({ message: 'Payment already processed', plan }); return;
    }

    await supabase
      .from('payments')
      .update({ status: 'success', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('provider_ref', reference);

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await supabase.from('subscriptions').update({ status: 'expired', updated_at: now.toISOString() })
      .eq('user_id', userId).eq('status', 'active');

    const { data: newSub } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan,
        status: 'active',
        amount: result.data?.amount / 100 || 0,
        currency: 'GHS',
        payment_provider: 'paystack',
        payment_reference: reference,
        starts_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    res.json({ message: 'Payment verified', subscription: newSub, plan });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ message: 'Payment verification failed' });
  }
}

export async function getPaymentHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false });

    res.json({ payments: payments || [] });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ message: 'Failed to fetch payment history' });
  }
}

export async function getAllPayments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    const enriched = await Promise.all(
      (payments || []).map(async (p) => {
        const { data: user } = await supabase.from('users').select('name, email').eq('id', p.user_id).single();
        return { ...p, userName: user?.name || 'Unknown', userEmail: user?.email || '' };
      })
    );

    const totalRevenue = enriched.filter((p) => p.status === 'success').reduce((sum, p) => sum + (p.amount || 0), 0);

    res.json({ payments: enriched, totalRevenue });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
}

export async function paystackWebhook(req: AuthRequest, res: Response): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const event = body?.event as string;
    const data = body?.data as Record<string, unknown> | undefined;

    if (event === 'charge.success' && data?.reference) {
      const reference = data.reference as string;
      const { data: existing } = await supabase.from('payments').select('id, status').eq('provider_ref', reference).maybeSingle();
      if (existing && existing.status !== 'success') {
        const result = await paystackRequest(`/transaction/verify/${reference}`);
        if (result.status && result.data?.status === 'success') {
          const meta = result.data?.metadata as Record<string, unknown> | undefined;
          const userId = meta?.user_id as string;
          const plan = meta?.plan as string;
          const now = new Date();
          const expiresAt = new Date(now); expiresAt.setMonth(expiresAt.getMonth() + 1);

          await supabase.from('payments').update({ status: 'success', paid_at: now.toISOString(), updated_at: now.toISOString() }).eq('provider_ref', reference);
          await supabase.from('subscriptions').update({ status: 'expired', updated_at: now.toISOString() }).eq('user_id', userId).eq('status', 'active');
          await supabase.from('subscriptions').insert({ user_id: userId, plan, status: 'active', amount: (result.data?.amount as number) / 100 || 0, currency: 'GHS', payment_provider: 'paystack', payment_reference: reference, starts_at: now.toISOString(), expires_at: expiresAt.toISOString() });
        }
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.json({ received: true });
  }
}
