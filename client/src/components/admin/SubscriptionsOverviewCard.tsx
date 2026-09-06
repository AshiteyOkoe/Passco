import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import { CreditCard, Wallet } from 'lucide-react';

interface SubscriptionsOverviewCardProps {
  overview: {
    active: number;
    expired: number;
    cancelled: number;
    newThisMonth: number;
    revenueThisMonth: number;
    revenueSeries: Array<{ month: string; total: number }>;
  };
}

export default function SubscriptionsOverviewCard({ overview }: SubscriptionsOverviewCardProps) {
  const tiles = [
    { label: 'Active', value: overview.active, color: 'text-emerald-500' },
    { label: 'New this month', value: overview.newThisMonth, color: 'text-blue-500' },
    { label: 'Expired', value: overview.expired, color: 'text-amber-500' },
    { label: 'Cancelled', value: overview.cancelled, color: 'text-rose-500' },
  ];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          <CreditCard className="h-4 w-4 text-amber-500" />
          Subscription Overview
        </h2>
        <Link to="/admin/subscriptions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
          Manage
        </Link>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-500/10">
        <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">Revenue this month</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">GH₵ {overview.revenueThisMonth.toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-800/50">
            <p className={`text-lg font-bold ${t.color}`}>{t.value.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={overview.revenueSeries} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip formatter={(v) => [`GH₵ ${Number(v).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }} />
            <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}