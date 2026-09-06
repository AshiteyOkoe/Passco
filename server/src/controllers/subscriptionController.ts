import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';
import { logAuditEvent } from '../services/auditService';
import { getEffectivePlan, grantTrial, PLAN_LIMITS, TRIAL_DAYS, PlanType } from '../services/subscriptionService';

export { PLAN_LIMITS };
export type { PlanType };

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getTrialDaysLeft(expiresAt: string | null): number {
  if (!expiresAt) return 0;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export async function getMySubscription(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const { count: subCount } = await supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!subCount && req.user!.role === 'student') {
      await grantTrial(userId);
    }

    const effective = await getEffectivePlan(userId);
    const plan = effective.plan;

    const month = getCurrentMonth();
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('questions_generated')
      .eq('user_id', userId)
      .eq('month', month)
      .maybeSingle();

    const limits = PLAN_LIMITS[plan];

    res.json({
      subscription: effective.subscription || { plan: 'free', status: 'active', expires_at: null },
      aiUsage: {
        used: usage?.questions_generated || 0,
        limit: limits.aiQuestions,
        month,
      },
      planLimits: limits,
      effectivePlan: plan,
      isTrial: effective.isTrial,
      trialDays: TRIAL_DAYS,
      trialDaysLeft: getTrialDaysLeft(effective.expiresAt),
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

    await logAuditEvent({
      userId: req.user!.id,
      action: 'suspend_user',
      entityType: 'subscription',
      entityId: id,
      details: { suspendedBy: req.user!.email },
      ipAddress: req.ip as string,
    });

    res.json({ message: 'User subscription suspended' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ message: 'Failed to suspend user' });
  }
}