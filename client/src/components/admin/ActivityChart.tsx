import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Loader2 } from 'lucide-react';
import { getAdminCommandCenter } from '../../services/api';
import { cn } from '../../utils';

const RANGES = [
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '3 Months', value: 90 },
  { label: '1 Year', value: 365 },
];

export default function ActivityChart() {
  const [range, setRange] = useState(30);
  const [data, setData] = useState<Array<{ date: string; attempts: number; activeStudents: number }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminCommandCenter(range)
      .then((res) => { if (!cancelled) setData(res.activity); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          <Activity className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="min-w-0">Student Activity</span>
        </h2>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                range === r.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="activeStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="attempts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(d: string) => {
                  const [, m, day] = d.split('-');
                  return `${Number(m)}/${Number(day)}`;
                }}
                minTickGap={24}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(d: string) => new Date(d + 'T00:00:00').toLocaleDateString()}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  fontSize: 12,
                  background: '#fff',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="activeStudents" name="Active students" stroke="#6366f1" strokeWidth={2} fill="url(#activeStudents)" />
              <Area type="monotone" dataKey="attempts" name="Attempts" stroke="#10b981" strokeWidth={2} fill="url(#attempts)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}