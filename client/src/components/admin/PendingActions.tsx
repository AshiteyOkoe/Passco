import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PendingActionsProps {
  actions: Array<{ id: string; label: string; count: number; to: string; severity: 'warning' | 'danger' | 'info' }>;
}

const SEVERITY_STYLES: Record<string, { chip: string; icon: string }> = {
  danger: { chip: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400', icon: 'text-rose-500' },
  warning: { chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400', icon: 'text-amber-500' },
  info: { chip: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400', icon: 'text-blue-500' },
};

export default function PendingActions({ actions }: PendingActionsProps) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        Requires Attention
      </h2>

      {actions.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="mb-3 h-8 w-8 text-emerald-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400">All clear — nothing needs your attention.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2.5">
          {actions.map((a) => {
            const style = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.warning;
            return (
              <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <div>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${style.chip}`}>
                    {a.count}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{a.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.count.toLocaleString()} item{a.count === 1 ? '' : 's'}</p>
                </div>
                <Link
                  to={a.to}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-indigo-400"
                >
                  Review
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}