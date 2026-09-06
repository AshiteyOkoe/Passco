import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

export const TRIAL_DAYS = 3;

export const PLAN_LIMITS = {
  free: {
    aiQuestions: 20,
    label: 'Free',
    quizzes: true,
    mocks: false,
    examinations: false,
    documentUploads: false,
    price: 0,
  },
  basic: {
    aiQuestions: -1,
    label: 'QnA Access',
    quizzes: true,
    mocks: true,
    examinations: true,
    documentUploads: true,
    price: 10,
  },
  premium: {
    aiQuestions: -1,
    label: 'QnA Access',
    quizzes: true,
    mocks: true,
    examinations: true,
    documentUploads: true,
    price: 10,
  },
} as const;

export type PlanType = keyof typeof PLAN_LIMITS;
export type PremiumFeature = keyof Pick<
  typeof PLAN_LIMITS.free,
  'mocks' | 'examinations' | 'documentUploads'
>;

export interface EffectivePlan {
  plan: PlanType;
  isTrial: boolean;
  expiresAt: string | null;
  subscription: {
    id?: string;
    plan: string;
    status: string;
    expires_at: string | null;
    payment_provider: string;
    payment_reference: string;
  } | null;
}

function isTrialRow(row: { payment_reference?: string; payment_provider?: string }): boolean {
  return String(row.payment_reference || '').startsWith('TRIAL-');
}

export async function getEffectivePlan(userId: string): Promise<EffectivePlan> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, plan, status, expires_at, payment_provider, payment_reference')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('starts_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const fallback: EffectivePlan = {
    plan: 'free',
    isTrial: false,
    expiresAt: null,
    subscription: null,
  };

  if (!sub) return fallback;

  const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    await supabase
      .from('subscriptions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', sub.id);
    return fallback;
  }

  const plan = (sub.plan as PlanType) || 'free';
  return {
    plan,
    isTrial: isTrialRow(sub),
    expiresAt: sub.expires_at,
    subscription: {
      id: sub.id,
      plan: sub.plan,
      status: sub.status,
      expires_at: sub.expires_at,
      payment_provider: sub.payment_provider,
      payment_reference: sub.payment_reference,
    },
  };
}

export async function grantTrial(userId: string): Promise<void> {
  const { count } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (count && count > 0) return;

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + TRIAL_DAYS);

  await supabase.from('subscriptions').insert({
    user_id: userId,
    plan: 'premium',
    status: 'active',
    amount: 0,
    currency: 'GHS',
    payment_provider: '',
    payment_reference: `TRIAL-${userId}`,
    starts_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
  });
}

export function requirePremiumFeature(feature: PremiumFeature) {
  return async function premiumMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Not authenticated' });
        return;
      }

      if (req.user.role === 'admin') {
        next();
        return;
      }

      const effective = await getEffectivePlan(req.user.id);
      const limits = PLAN_LIMITS[effective.plan];
      if (limits && limits[feature]) {
        next();
        return;
      }

      res.status(403).json({
        message: `${feature} requires an active subscription. Your free trial has ended or is not active.`,
        requiresPlan: 'premium',
      });
    } catch (error) {
      console.error('Premium feature check error:', error);
      res.status(500).json({ message: 'Failed to verify subscription' });
    }
  };
}