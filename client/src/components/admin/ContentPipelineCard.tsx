import { Link } from 'react-router-dom';
import { FileText, Settings2, ArrowRight, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '../../utils';

interface ContentPipelineCardProps {
  pipeline: {
    total: number;
    processing: number;
    failed: number;
    ready: number;
    queued: number;
    items: Array<{ id: string; name: string; uploadedBy: string; status: string; questionsGenerated: number; createdAt: string }>;
  };
}

const STATUS_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  ready: { label: 'Ready', icon: CheckCircle2, className: 'text-emerald-500' },
  processing: { label: 'Processing', icon: Loader2, className: 'text-blue-500' },
  queued: { label: 'Queued', icon: Clock, className: 'text-amber-500' },
  failed: { label: 'Failed', icon: XCircle, className: 'text-rose-500' },
};

export default function ContentPipelineCard({ pipeline }: ContentPipelineCardProps) {
  const tiles = [
    { label: 'Uploaded', value: pipeline.total, color: 'text-slate-700 dark:text-slate-200' },
    { label: 'Processing', value: pipeline.processing + pipeline.queued, color: 'text-blue-500' },
    { label: 'Completed', value: pipeline.ready, color: 'text-emerald-500' },
    { label: 'Failed', value: pipeline.failed, color: 'text-rose-500' },
  ];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
        <Settings2 className="h-4 w-4 text-blue-500" />
        Content Processing
      </h2>

      <div className="mb-4 grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-800/50">
            <p className={cn('text-lg font-bold', t.color)}>{t.value.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 space-y-2.5">
        {pipeline.items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No files currently processing or awaiting attention.</p>
        ) : (
          pipeline.items.map((item) => {
            const meta = STATUS_META[item.status] || STATUS_META.processing;
            const Icon = meta.icon;
            return (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900', meta.className)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{item.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.uploadedBy} · {item.questionsGenerated} questions
                  </p>
                </div>
                <span className={cn('text-xs font-semibold', meta.className)}>{STATUS_META[item.status]?.label || item.status}</span>
              </div>
            );
          })
        )}
      </div>

      <Link
        to="/admin/files"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-400"
      >
        View Processing Queue <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}