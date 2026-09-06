import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Gem } from 'lucide-react';
import { useSubscription, type PremiumFeatureKey } from '../context/SubscriptionContext';

interface SubscriptionGateProps {
  children: React.ReactNode;
  feature?: PremiumFeatureKey;
  featureName?: string;
}

const FEATURE_LABELS: Record<PremiumFeatureKey, string> = {
  mocks: 'Mock assessments',
  examinations: 'Examinations',
  documentUploads: 'Document uploads & processing',
};

export default function SubscriptionGate({
  children,
  feature = 'examinations',
  featureName,
}: SubscriptionGateProps) {
  const navigate = useNavigate();
  const { loading, hasFeature, isTrial, trialDaysLeft } = useSubscription();
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    setHasAccess(hasFeature(feature));
  }, [hasFeature, feature]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!hasAccess) {
    const label = featureName || FEATURE_LABELS[feature];
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Premium Feature
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {label} requires a subscription. Your <span className="font-semibold text-indigo-600 dark:text-indigo-400">3-day free trial</span> has ended{!isTrial && trialDaysLeft <= 0 ? '' : ' or is not active'}.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/subscription')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors"
            >
              <Gem className="w-5 h-5" />
              Subscribe Now
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}