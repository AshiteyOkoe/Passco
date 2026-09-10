import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getMySubscription } from '../services/api';
import type { MySubscriptionResponse, PlanLimits } from '../types';

export type PremiumFeatureKey = 'mocks' | 'examinations' | 'documentUploads';

interface SubscriptionContextType {
  loading: boolean;
  subscription: MySubscriptionResponse['subscription'] | null;
  planLimits: PlanLimits | null;
  effectivePlan: 'free' | 'basic' | 'premium';
  isTrial: boolean;
  trialDaysLeft: number;
  isPremium: boolean;
  refresh: () => Promise<void>;
  hasFeature: (feature: PremiumFeatureKey) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MySubscriptionResponse | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await getMySubscription();
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        refresh();
      } else {
        setData(null);
        setLoading(false);
      }
    }
  }, [authLoading, user, refresh]);

  const effectivePlan = user?.role === 'admin' ? 'premium' : data?.effectivePlan || 'free';
  const isPremium = user?.role === 'admin' || effectivePlan !== 'free';

  const hasFeature = useCallback(
    (feature: PremiumFeatureKey): boolean => {
      if (user?.role === 'admin') return true;
      if (effectivePlan !== 'free') return true;
      return !!data?.planLimits?.[feature];
    },
    [data, effectivePlan, user]
  );

  return (
    <SubscriptionContext.Provider
      value={{
        loading: loading || (authLoading && !!user),
        subscription: data?.subscription || null,
        planLimits: data?.planLimits || null,
        effectivePlan,
        isTrial: !!data?.isTrial,
        trialDaysLeft: data?.trialDaysLeft ?? 0,
        isPremium,
        refresh,
        hasFeature,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}