import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CreditCard, Gem, CalendarClock, ArrowRight, CheckCircle2,
  XCircle, Clock, ShieldCheck, Download, Sparkles,
} from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';
import { getPaymentHistory } from '../services/api';
import type { Payment } from '../types';
import { cn } from '../utils';

const planMeta: Record<string, { label: string; color: string; text: string; icon: typeof Gem }> = {
  free: { label: 'Free', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', text: 'text-slate-600 dark:text-slate-300', icon: Sparkles },
  basic: { label: 'Basic', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400', text: 'text-blue-600 dark:text-blue-400', icon: ShieldCheck },
  premium: { label: 'Premium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', text: 'text-amber-600 dark:text-amber-400', icon: Gem },
};

function statusPill(status: Payment['status']) {
  const map: Record<Payment['status'], { label: string; cls: string }> = {
    success: { label: 'Successful', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
    failed: { label: 'Failed', cls: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
    refunded: { label: 'Refunded', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  };
  return map[status];
}

export default function SubscriptionSection() {
  const { effectivePlan, isTrial, trialDaysLeft, subscription, loading: subLoading } = useSubscription();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPaymentHistory()
      .then((res) => setPayments(res.payments))
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, []);

  const meta = planMeta[effectivePlan] || planMeta.free;
  const PlanIcon = meta.icon;
  const upcoming = effectivePlan !== 'free' && subscription?.expires_at;
  const paidCount = payments.filter((p) => p.status === 'success').length;
  const totalSpent = payments
    .filter((p) => p.status === 'success')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="grid grid-cols-1 md:grid-cols-3">
        <div className={cn('flex flex-col justify-between bg-gradient-to-br p-5', effectivePlan === 'premium' ? 'from-amber-500/10 to-amber-500/5' : effectivePlan === 'basic' ? 'from-blue-500/10 to-blue-500/5' : 'from-slate-500/10 to-slate-500/5')}>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-slate-800">
                <PlanIcon className={cn('h-4.5 w-4.5', meta.text)} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">Current Plan</p>
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold', meta.color)}>
                  {meta.label}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {effectivePlan === 'free'
                ? isTrial
                  ? 'Your 3-day Premium trial is active.'
                  : 'You are on the free plan.'
                : 'Your subscription is active.'}
            </p>
            {isTrial && effectivePlan === 'premium' && (
              <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                Trial ends in {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'}
              </p>
            )}
            {upcoming && subscription?.expires_at && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <CalendarClock className="h-3 w-3" />
                Expires {new Date(subscription.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
          <Link
            to="/subscription"
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {effectivePlan === 'free' ? (isTrial ? 'Upgrade' : 'Subscribe') : 'Manage / Renew'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="col-span-1 md:col-span-2 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/10">
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Payment History</h2>
            </div>
            {paidCount > 0 && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                GH₵{totalSpent.toFixed(2)} paid
              </span>
            )}
          </div>

          {loading || subLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-8 text-center dark:border-slate-700">
              <CreditCard className="mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No payments yet</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {effectivePlan === 'free' ? 'Subscribe to unlock premium features.' : 'Paid transactions will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th className="pb-2 pr-3 font-semibold">Date</th>
                    <th className="pb-2 pr-3 font-semibold">Plan</th>
                    <th className="pb-2 pr-3 font-semibold">Amount</th>
                    <th className="pb-2 pr-3 font-semibold">Reference</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 5).map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                      <td className="py-2.5 pr-3 text-slate-500 dark:text-slate-400">
                        {new Date(p.paid_at || p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          {p.plan}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-slate-800 dark:text-white">
                        GH₵{Number(p.amount).toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono text-xs text-slate-400">{p.provider_ref}</td>
                      <td className="py-2.5">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', statusPill(p.status).cls)}>
                          {p.status === 'success' ? <CheckCircle2 className="h-3 w-3" /> : p.status === 'pending' ? <Clock className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {statusPill(p.status).label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {payments.filter((p) => p.status === 'success').length > 0 && (
            <p className="mt-3 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Download className="h-3 w-3" /> Payments are processed securely via Paystack.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}