import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  className?: string;
  hideSummary?: boolean;
}

function pageWindow(page: number, totalPages: number): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) pages.push('ellipsis-start');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('ellipsis-end');
  pages.push(totalPages);

  return pages;
}

const pageButtonClass = (isActive: boolean) =>
  cn(
    'inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition',
    isActive
      ? 'bg-indigo-600 text-white shadow-sm'
      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
  );

export default function Pagination({
  page,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  className,
  hideSummary = false,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalItems);

  return (
    <div className={cn('flex flex-col items-center gap-3 sm:flex-row sm:justify-between', className)}>
      {!hideSummary && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{start}–{end}</span> of{' '}
          <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span>
        </p>
      )}

      <div className="flex items-center gap-1.5" role="navigation" aria-label="Pagination">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className={cn(pageButtonClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageWindow(page, totalPages).map((p, i) =>
          typeof p === 'number' ? (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`}
              className={pageButtonClass(p === page)}
            >
              {p}
            </button>
          ) : (
            <span key={`${p}-${i}`} aria-hidden="true" className="px-1 text-sm text-slate-400 dark:text-slate-500">
              …
            </span>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className={cn(pageButtonClass(false), 'disabled:cursor-not-allowed disabled:opacity-40')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}