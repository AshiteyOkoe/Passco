import { Link } from 'react-router-dom';
import { BarChart3, GraduationCap } from 'lucide-react';
import { cn } from '../../utils';

interface SubjectPerformanceTableProps {
  subjects: Array<{ subject: string; students: number; attempts: number; avgScore: number; passRate: number }>;
}

export default function SubjectPerformanceTable({ subjects }: SubjectPerformanceTableProps) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          <GraduationCap className="h-4 w-4 shrink-0 text-blue-500" />
          <span className="min-w-0">Subject Performance</span>
        </h2>
        <Link to="/admin/analytics" className="ml-auto shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
          View details
        </Link>
      </div>

      {subjects.length === 0 ? (
        <div className="flex flex-col items-center py-8">
          <BarChart3 className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No examination data yet.</p>
        </div>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:text-slate-500">
                <th className="pb-2.5 pr-4 font-semibold">Subject</th>
                <th className="pb-2.5 pr-4 font-semibold">Students</th>
                <th className="pb-2.5 pr-4 font-semibold">Avg Score</th>
                <th className="pb-2.5 font-semibold">Pass Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {subjects.slice(0, 8).map((s) => (
                <tr key={s.subject} className="group">
                  <td className="max-w-[180px] truncate py-3 pr-4 font-medium text-slate-800 dark:text-white">{s.subject}</td>
                  <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{s.students.toLocaleString()}</td>
                  <td className="py-3 pr-4">
                    <span className={cn('font-semibold', s.avgScore >= 75 ? 'text-emerald-500' : s.avgScore >= 50 ? 'text-amber-500' : 'text-rose-500')}>
                      {s.avgScore}%
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className={cn('h-full rounded-full', s.passRate >= 70 ? 'bg-emerald-500' : s.passRate >= 50 ? 'bg-amber-500' : 'bg-rose-500')}
                          style={{ width: `${s.passRate}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{s.passRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}