import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

export const PLAN_LIMITS = {
  free: { aiQuestions: 10, label: 'Free Trial', quizzes: true, mocks: true, examinations: false, price: 0 },
  basic: { aiQuestions: 30, label: 'Basic', quizzes: true, mocks: true, examinations: false, price: 29 },
  premium: { aiQuestions: 50, label: 'Premium', quizzes: true, mocks: true, examinations: true, price: 59 },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getMySubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user!.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const month = getCurrentMonth();
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('questions_generated')
      .eq('user_id', req.user!.id)
      .eq('month', month)
      .maybeSingle();

    const plan = (sub?.plan as PlanType) || 'free';
    const limits = PLAN_LIMITS[plan];

    res.json({
      subscription: sub || { plan: 'free', status: 'active', expires_at: null },
      aiUsage: {
        used: usage?.questions_generated || 0,
        limit: limits.aiQuestions,
        month,
      },
      planLimits: limits,
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Failed to fetch subscription' });
  }
}

export async function getAllSubscriptions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    const enriched = await Promise.all(
      (subs || []).map(async (sub) => {
        const { data: user } = await supabase.from('users').select('name, email').eq('id', sub.user_id).single();
        return {
          ...sub,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || '',
        };
      })
    );

    res.json({ subscriptions: enriched });
  } catch (error) {
    console.error('Get all subscriptions error:', error);
    res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
}

export async function suspendUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { data: user } = await supabase.from('users').select('role').eq('id', id).single();
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (user.role === 'admin') { res.status(400).json({ message: 'Cannot suspend admin users' }); return; }

    await supabase
      .from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', id)
      .eq('status', 'active');

    res.json({ message: 'User subscription suspended' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ message: 'Failed to suspend user' });
  }
}
