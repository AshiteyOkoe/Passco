import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getMySubscription, initializePayment, verifyPayment } from '../services/api';
import { Check, Crown, Zap, Sparkles, ArrowRight, Clock, AlertCircle, CreditCard, Star, Shield } from 'lucide-react';
import { fadeUp, stagger } from '../utils/animations';
import type { Subscription, PlanLimits } from '../types';
import AnimatedSpinner from '../components/AnimatedSpinner';

const plans = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    period: 'forever',
    description: 'Get started with basic features',
    icon: Zap,
    color: 'from-slate-500 to-slate-600',
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    border: 'border-slate-200 dark:border-slate-700',
    features: [
      'Access to all JHS & SHS subjects',
      'Quizzes (10 questions)',
      'Mock exams (20 questions)',
      '20 AI-generated questions/month',
      'Basic progress tracking',
    ],
    limitations: [
      'No full examinations',
      'Limited AI generation',
      'No advanced analytics',
    ],
  },
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 29,
    period: '/month',
    description: 'Unlock more practice tools',
    icon: Star,
    color: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-800',
    popular: false,
    features: [
      'Access to all subjects',
      'Unlimited quizzes',
      'Unlimited mock exams',
      '500 AI-generated questions/month',
      'Detailed progress tracking',
      'Score history & trends',
    ],
    limitations: [
      'No full examinations',
      'No advanced analytics',
    ],
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price: 59,
    period: '/month',
    description: 'Everything you need to ace your exams',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-800',
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

export default function Subscription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [aiUsage, setAiUsage] = useState({ used: 0, limit: 20, month: '' });
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getMySubscription()
      .then((res) => {
        setCurrentSub(res.subscription);
        setAiUsage(res.aiUsage);
      })
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
          setCurrentSub(res.subscription);
          setAiUsage(res.aiUsage);
        })
        .catch(() => setError('Payment verification failed'))
        .finally(() => setVerifying(false));
    }
  }, [searchParams]);

  const handlePurchase = async (plan: string) => {
    if (!user) { navigate('/login'); return; }
    setPurchasing(plan);
    setError('');
    try {
      const res = await initializePayment({ plan, email: user.email });
      if (res.authorization_url) {
        window.location.href = res.authorization_url;
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message
        : 'Payment failed';
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
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
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

      {currentSub && currentSub.plan !== 'free' && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-8 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-indigo-100 p-5 dark:border-indigo-800 dark:from-indigo-950/40 dark:to-indigo-900/40"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Current Plan</p>
              <p className="text-xl font-bold text-indigo-900 dark:text-indigo-200">{currentSub.plan.toUpperCase()} Plan</p>
              {currentSub.expires_at && (
                <p className="mt-1 flex items-center gap-1 text-xs text-indigo-600/80 dark:text-indigo-400/80">
                  <Clock className="h-3 w-3" />
                  Renews {new Date(currentSub.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-indigo-600/80 dark:text-indigo-400/80">AI Questions Used</p>
              <p className="text-lg font-bold text-indigo-900 dark:text-indigo-200">
                {aiUsage.used} / {aiUsage.limit === -1 ? '∞' : aiUsage.limit}
              </p>
              <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-800">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
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

      {loading ? (
        <AnimatedSpinner label="Loading plans..." />
      ) : (
        <motion.div
          className="grid gap-6 md:grid-cols-3"
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
                } ${isCurrent ? 'ring-2 ring-indigo-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 text-xs font-bold text-white shadow-md">
                    MOST POPULAR
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
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
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}
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
                ) : plan.id === 'free' ? (
                  <button
                    disabled
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800"
                  >
                    Default
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
          <Shield className="h-5 w-5 text-indigo-500" /> Secure Payments
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
