import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getMySubscription, initializePayment, verifyPayment, getPaystackPublicKey } from '../services/api';
import { Check, Gem, ArrowRight, Clock, AlertCircle, CreditCard, Shield } from 'lucide-react';
import { fadeUp, stagger } from '../utils/animations';
import type { Subscription, MySubscriptionResponse } from '../types';
import AnimatedSpinner from '../components/AnimatedSpinner';

const plans = [
  {
    id: 'basic',
    name: 'QnA Access Plan',
    price: 15,
    period: '/14 days',
    description: 'Full access to all features',
    icon: Gem,
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-800',
    popular: true,
    features: [
      'Access to all subjects',
      'Unlimited quizzes',
      'Unlimited mock exams',
      'Unlimited examinations',
      'Unlimited AI-generated questions',
      'Advanced analytics & reports',
      'Performance insights',
      'Priority support',
    ],
    limitations: [],
  },
];

interface PaystackPopArgs {
  key: string;
  access_code?: string;
  ref?: string;
  email?: string;
  amount?: number;
  currency?: string;
  onSuccess?: (txnRef: string) => void;
  onCancel?: () => void;
}

interface PaystackPopWindow {
  PaystackPop?: {
    setup: (args: PaystackPopArgs) => void;
  };
}

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as PaystackPopWindow;
    if (w.PaystackPop) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack. Check your connection.'));
    document.body.appendChild(script);
  });
}

export default function Subscription() {
  const { user } = useAuth();
  const { refresh: refreshSubscription } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [aiUsage, setAiUsage] = useState({ used: 0, limit: 20, month: '' });
  const [effectivePlan, setEffectivePlan] = useState<'free' | 'basic' | 'premium'>('free');
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const applySubscription = (res: MySubscriptionResponse) => {
    setCurrentSub(res.subscription);
    setAiUsage(res.aiUsage);
    setEffectivePlan(res.effectivePlan);
    setIsTrial(res.isTrial);
    setTrialDaysLeft(res.trialDaysLeft);
  };

  useEffect(() => {
    getMySubscription()
      .then(applySubscription)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const paymentRef = searchParams.get('reference');
    if (paymentRef) {
      setVerifying(true);
      verifyPayment(paymentRef)
        .then(() => {
          setSuccess(true);
          return getMySubscription();
        })
        .then((res) => {
          applySubscription(res);
          refreshSubscription();
        })
        .catch(() => setError('Payment verification failed'))
        .finally(() => setVerifying(false));
    }
  }, [searchParams]);

  const handlePurchase = async (planId: string) => {
    if (!user) { navigate('/login'); return; }
    setPurchasing(planId);
    setError('');
    try {
      const res = await initializePayment({ plan: planId, email: user.email });

      if (res.access_code) {
        const { publicKey } = await getPaystackPublicKey();
        if (!publicKey) {
          setError('Paystack is not configured yet. Add PAYSTACK_PUBLIC_KEY to the server .env and restart.');
          setPurchasing(null);
          return;
        }

        await loadPaystackScript();
        const w = window as PaystackPopWindow;
        if (!w.PaystackPop) {
          setResumeUrl(res.authorization_url || null);
          setPurchasing(null);
          return;
        }

        const resetPurchasing = setTimeout(() => setPurchasing(null), 90000);
        const popupFallback = setTimeout(() => {
          clearTimeout(resetPurchasing);
          setResumeUrl(res.authorization_url || null);
          setPurchasing(null);
        }, 12000);

        const teardown = () => {
          clearTimeout(resetPurchasing);
          clearTimeout(popupFallback);
        };

        w.PaystackPop.setup({
          key: publicKey,
          access_code: res.access_code,
          ref: res.reference,
          onSuccess: async (txnRef) => {
            teardown();
            try {
              await verifyPayment(txnRef || res.reference);
              setSuccess(true);
              const sub = await getMySubscription();
              if (sub) {
                applySubscription(sub);
                refreshSubscription();
              }
            } catch {
              setError('Payment verification failed. Your plan may take a few moments to activate.');
            } finally {
              setPurchasing(null);
            }
          },
          onCancel: () => {
            teardown();
            setPurchasing(null);
          },
        });
        return;
      }

      if (res.authorization_url) {
        window.location.href = res.authorization_url;
        return;
      }

      throw new Error('Could not start the payment');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message
        : err instanceof Error ? err.message : 'Payment failed';
      setError(msg || 'Payment initialization failed');
      setPurchasing(null);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <AnimatedSpinner label="Verifying payment..." />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md text-center"
        >
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25">
            <Check className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Payment Successful!</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Your plan has been activated. Enjoy your new features!</p>
          <button
            onClick={() => { setSuccess(false); navigate('/subscription'); }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  const currentPlan = currentSub?.plan || 'free';

  return (
    <div className="p-4 sm:p-6">
      <motion.div className="mb-8" variants={fadeUp} initial="hidden" animate="visible">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Plans</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the plan that fits your learning journey.</p>
      </motion.div>

      {isTrial && trialDaysLeft > 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/40"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
                <Gem className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Free 14-Day Premium Trial
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-200/70">
                  {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} remaining — everything is unlocked.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/60 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <Clock className="h-3 w-3" /> {trialDaysLeft}d left
            </span>
          </div>
        </motion.div>
      )}

      {!isTrial && effectivePlan === 'free' && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60"
        >
          <p className="text-sm font-semibold text-slate-800 dark:text-white">Your trial has ended</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Mock assessments, examinations and document processing are now locked. Subscribe to continue.
          </p>
        </motion.div>
      )}

      {currentSub && effectivePlan !== 'free' && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-8 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-5 dark:border-blue-800 dark:from-blue-950/40 dark:to-blue-900/40"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Current Plan</p>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-200">
                {effectivePlan.toUpperCase()} Plan
                {isTrial && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    Free Trial
                  </span>
                )}
              </p>
              {currentSub.expires_at && (
                <p className="mt-1 flex items-center gap-1 text-xs text-blue-600/80 dark:text-blue-400/80">
                  <Clock className="h-3 w-3" />
                  {isTrial ? 'Trial ends' : 'Renews'} {new Date(currentSub.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600/80 dark:text-blue-400/80">AI Questions Used</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-200">
                {aiUsage.used} / {aiUsage.limit === -1 ? '∞' : aiUsage.limit}
              </p>
              <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${aiUsage.limit === -1 ? 10 : Math.min((aiUsage.used / aiUsage.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {resumeUrl && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Payment window blocked or closed?</p>
            <p className="mt-0.5 text-xs opacity-80">Click below to continue on the Paystack payment page.</p>
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Continue to payment <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {loading ? (
        <AnimatedSpinner label="Loading plans..." />
      ) : (
        <motion.div
          className="mx-auto max-w-md"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.id}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className={`relative rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-900 transition-shadow hover:shadow-lg ${
                  plan.popular ? 'border-amber-300 dark:border-amber-700' : plan.border
                } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 text-xs font-bold text-white shadow-md">
                    MOST POPULAR
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                    CURRENT
                  </div>
                )}

                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${plan.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>

                <div className="my-5 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">GH₵ {plan.price}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{plan.period}</span>
                </div>

                <ul className="mb-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" /> {f}
                    </li>
                  ))}
                  {plan.limitations.map((l) => (
                    <li key={l} className="flex items-start gap-2 text-sm text-slate-400 dark:text-slate-500">
                      <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-xs">✕</span> {l}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => handlePurchase(plan.id)}
                    disabled={purchasing !== null}
                    className={`w-full rounded-xl bg-gradient-to-r ${plan.color} py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50`}
                  >
                    {purchasing === plan.id ? 'Processing...' : (
                      <span className="inline-flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Subscribe Now
                      </span>
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      <motion.div
        className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
          <Shield className="h-5 w-5 text-blue-500" /> Secure Payments
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { title: 'Paystack Secured', desc: 'All payments are processed securely via Paystack' },
            { title: 'Instant Activation', desc: 'Your plan activates immediately after payment' },
            { title: 'Cancel Anytime', desc: 'No long-term commitments. Cancel your subscription anytime' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
