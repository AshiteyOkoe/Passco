import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Trophy, Target, CheckCircle2, Clock, BookOpen } from 'lucide-react';

interface ExamPerformanceCardProps {
  assessment: {
    total: number;
    avgScore: number;
    passRate: number;
    completionRate: number;
    avgTimeMin: number;
    series: Array<{ date: string; count: number }>;
  };
}

const METRICS = [
  { label: 'Average Score', key: 'avgScore', suffix: '%', icon: Target, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { label: 'Pass Rate', key: 'passRate', suffix: '%', icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { label: 'Completion Rate', key: 'completionRate', suffix: '%', icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  { label: 'Average Time', key: 'avgTimeMin', suffix: ' min', icon: Clock, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
];

export default function ExamPerformanceCard({ assessment }: ExamPerformanceCardProps) {
  const data = assessment.series.map((s) => ({
    date: s.date,
    count: s.count,
  }));

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
        <BookOpen className="h-4 w-4 text-rose-500" />
        Examination Performance
      </h2>

      <div className="mb-4 grid grid-cols-2 gap-3">
        {METRICS.map((m) => (
          <div key={m.key} className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className={`flex h-6 w-6 items-center justify-center rounded-lg ${m.bg}`}>
                <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{m.label}</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              {assessment[m.key as 'avgScore']}
              <span className="text-sm font-medium text-slate-400">{m.suffix}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex-1">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="examCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`} minTickGap={28} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, background: '#fff' }} />
            <Area type="monotone" dataKey="count" name="Exams completed" stroke="#f43f5e" strokeWidth={2} fill="url(#examCount)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
        {assessment.total.toLocaleString()} assessments recorded
      </p>
    </div>
  );
}