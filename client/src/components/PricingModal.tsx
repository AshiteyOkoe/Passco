import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Check, Shield, AlertCircle, ArrowRight, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { getMySubscription } from '../services/api';
import { subscriptionPlans } from '../data/subscriptionPlans';
import { usePaystackPayment } from '../hooks/usePaystackPayment';
import { useModalA11y } from '../hooks/useModalA11y';
import type { Subscription, MySubscriptionResponse } from '../types';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onRequireAuth: (tab: 'login' | 'register') => void;
}

export default function PricingModal({ open, onClose, onRequireAuth }: PricingModalProps) {
  const { user } = useAuth();
  const { refresh: refreshSubscription } = useSubscription();
  const { dialogRef } = useModalA11y(open, { onClose });

  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [aiUsage, setAiUsage] = useState({ used: 0, limit: 20, month: '' });
  const [effectivePlan, setEffectivePlan] = useState<'free' | 'basic' | 'premium'>('free');
  const [isTrial, setIsTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const applySubscription = (res: MySubscriptionResponse) => {
    setCurrentSub(res.subscription);
    setAiUsage(res.aiUsage);
    setEffectivePlan(res.effectivePlan);
    setIsTrial(res.isTrial);
    setTrialDaysLeft(res.trialDaysLeft);
  };

  const {
    purchase,
    purchasing,
    error,
    resumeUrl,
    clearError,
    clearResume,
  } = usePaystackPayment(user?.email, {
    onSuccess: () => {
      setSuccess(true);
      getMySubscription()
        .then((res) => {
          applySubscription(res);
          refreshSubscription();
        })
        .catch(() => {});
    },
  });

  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    setLoading(true);
    getMySubscription()
      .then((res) => {
        if (active) applySubscription(res);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, user]);

  const handleSubscribe = (planId: string) => {
    if (!user) {
      onRequireAuth('register');
      return;
    }
    clearError();
    clearResume();
    setSuccess(false);
    purchase(planId);
  };

  const currentPlan = currentSub?.plan || 'free';

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pricing-modal-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                  <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="pricing-modal-title" className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                    Subscription Plans
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Choose the plan that fits your learning journey.</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {success ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25">
                    <Check className="h-8 w-8 text-white" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Payment Successful!</h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Your plan has been activated. Enjoy your new features!
                  </p>
                </div>
              ) : (
                <>
                  {user && isTrial && trialDaysLeft > 0 && (
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-800 dark:from-amber-950/40 dark:to-orange-950/40">
                      <div className="flex items-center gap-2.5">
                        <Check className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          Free {trialDaysLeft}-day premium trial active
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-200/60 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        <Clock className="h-3 w-3" aria-hidden="true" /> {trialDaysLeft}d left
                      </span>
                    </div>
                  )}

                  {user && !isTrial && effectivePlan === 'free' && (
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">Your trial has ended</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Mock assessments, examinations and document processing are now locked. Subscribe to continue.
                      </p>
                    </div>
                  )}

                  {user && currentSub && effectivePlan !== 'free' && (
                    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100 p-4 dark:border-blue-800 dark:from-blue-950/40 dark:to-blue-900/40">
                      <div>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Current Plan</p>
                        <p className="text-base font-bold text-blue-900 dark:text-blue-200">
                          {effectivePlan.toUpperCase()} Plan
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80">AI Questions Used</p>
                        <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                          {aiUsage.used} / {aiUsage.limit === -1 ? '∞' : aiUsage.limit}
                        </p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
                    </div>
                  )}

                  {resumeUrl && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                      <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="font-semibold">Payment window blocked or closed?</p>
                        <a
                          href={resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          Continue to payment <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  )}

                  {loading ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-center">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">Loading plans...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {subscriptionPlans.map((plan) => {
                        const isCurrent = currentPlan === plan.id;
                        const Icon = plan.icon;
                        return (
                          <div
                            key={plan.id}
                            className={`relative rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-950 ${
                              plan.popular ? 'border-amber-300 dark:border-amber-700' : plan.border
                            } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}
                          >
                            {plan.popular && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 text-xs font-bold text-white shadow-md">
                                MOST POPULAR
                              </div>
                            )}
                            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${plan.color}`}>
                              <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{plan.description}</p>
                            <div className="my-4 flex items-baseline gap-1">
                              <span className="text-3xl font-bold text-slate-900 dark:text-white">GH₵ {plan.price}</span>
                              <span className="text-sm text-slate-500 dark:text-slate-400">{plan.period}</span>
                            </div>
                            <ul className="mb-6 grid gap-2 sm:grid-cols-2">
                              {plan.features.map((f) => (
                                <li key={f} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" aria-hidden="true" /> {f}
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
                                onClick={() => handleSubscribe(plan.id)}
                                disabled={purchasing !== null}
                                className={`w-full rounded-xl bg-gradient-to-r ${plan.color} py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50`}
                              >
                                {purchasing === plan.id ? 'Processing...' : (
                                  <span className="inline-flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" aria-hidden="true" /> Subscribe Now
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                      <Shield className="h-4 w-4 text-blue-500" aria-hidden="true" /> Secure Payments
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { title: 'Paystack Secured', desc: 'All payments processed securely via Paystack' },
                        { title: 'Instant Activation', desc: 'Your plan activates immediately after payment' },
                        { title: 'Cancel Anytime', desc: 'No long-term commitments' },
                      ].map((item) => (
                        <div key={item.title} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                          <p className="text-xs font-semibold text-slate-800 dark:text-white">{item.title}</p>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-slate-200 px-5 py-3 sm:px-6 dark:border-slate-800">
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-indigo-700"
              >
                {success ? 'Done' : 'Got It'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}