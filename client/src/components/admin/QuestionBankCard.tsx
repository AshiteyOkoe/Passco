import { Link } from 'react-router-dom';
import { Library, PlusCircle } from 'lucide-react';
import { cn } from '../../utils';

interface QuestionBankCardProps {
  total: number;
  breakdown: Array<{ subject: string; count: number }>;
}

const BAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];

export default function QuestionBankCard({ total, breakdown }: QuestionBankCardProps) {
  const max = Math.max(...breakdown.map((b) => b.count), 1);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
        <Library className="h-4 w-4 text-violet-500" />
        Question Bank
      </h2>

      <p className="mb-4 text-3xl font-bold text-slate-900 dark:text-white">
        {total.toLocaleString()}
        <span className="ml-1 text-sm font-medium text-slate-400">questions</span>
      </p>

      <div className="flex-1 space-y-2.5">
        {breakdown.map((b, i) => (
          <div key={b.subject}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">{b.subject}</span>
              <span className="font-medium text-slate-800 dark:text-white">{b.count.toLocaleString()}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn('h-full rounded-full', BAR_COLORS[i % BAR_COLORS.length])}
                style={{ width: `${(b.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          to="/admin/jhs-questions"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <PlusCircle className="h-4 w-4" /> Add Questions
        </Link>
        <Link
          to="/admin/questions"
          className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-400"
        >
          Manage Question Bank
        </Link>
      </div>
    </div>
  );
}