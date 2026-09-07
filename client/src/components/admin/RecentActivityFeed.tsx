import { Activity, BookOpen, CheckCircle2, Clock, FileText } from 'lucide-react';
import { cn } from '../../utils';

interface RecentActivityFeedProps {
  items: Array<{ id: string; kind: string; actor: string; text: string; meta: string; time: string }>;
}

const KIND_META: Record<string, { icon: React.ComponentType<{ className?: string }>; className: string; bg: string; label: string }> = {
  result: { icon: CheckCircle2, className: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'Result' },
  document: { icon: FileText, className: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', label: 'File' },
  assessment: { icon: BookOpen, className: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', label: 'Exam' },
  attempt: { icon: Clock, className: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', label: 'Started' },
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function RecentActivityFeed({ items }: RecentActivityFeedProps) {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
        <Activity className="h-4 w-4 shrink-0 text-indigo-500" />
        <span className="min-w-0">Recent Activity</span>
      </h2>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">No recent activity yet.</p>
      ) : (
        <div className="flex-1 space-y-3">
          {items.map((item) => {
            const meta = KIND_META[item.kind] || KIND_META.attempt;
            const Icon = meta.icon;
            return (
              <div key={item.id} className="flex items-center gap-3">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.bg)}>
                  <Icon className={cn('h-4 w-4', meta.className)} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-white">
                    <span className="font-semibold">{item.actor}</span> {item.text}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(item.time)}</p>
                </div>
                <span className={cn('shrink-0 text-xs font-semibold', item.meta === 'In progress' ? 'text-blue-500' : meta.className)}>
                  {item.meta}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}