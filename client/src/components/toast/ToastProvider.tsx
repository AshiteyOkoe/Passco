import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '../../utils';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const AUTO_DISMISS_MS = 4200;

const STYLES: Record<ToastVariant, { icon: typeof Info; accent: string; iconBox: string }> = {
  success: {
    icon: CheckCircle2,
    accent: 'border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-slate-800',
    iconBox: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  },
  error: {
    icon: AlertCircle,
    accent: 'border-rose-200 bg-white dark:border-rose-500/30 dark:bg-slate-800',
    iconBox: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  },
  info: {
    icon: Info,
    accent: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800',
    iconBox: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toast = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev, { id, variant, title, description }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss]
  );

  const value: ToastContextValue = {
    toast,
    success: useCallback((t: string, d?: string) => toast('success', t, d), [toast]),
    error: useCallback((t: string, d?: string) => toast('error', t, d), [toast]),
    info: useCallback((t: string, d?: string) => toast('info', t, d), [toast]),
  };

  const errorItems = items.filter((i) => i.variant === 'error');
  const otherItems = items.filter((i) => i.variant !== 'error');

  const renderToast = (item: ToastItem) => {
    const s = STYLES[item.variant];
    const Icon = s.icon;
    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={cn(
          'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3.5 shadow-lg shadow-slate-900/5',
          s.accent
        )}
      >
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', s.iconBox)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
          {item.description && <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>}
        </div>
        <button
          onClick={() => dismiss(item.id)}
          aria-label="Dismiss notification"
          className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    );
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Error toasts: role=alert, announced immediately */}
      <div
        role="alert"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 top-20 z-[130] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:items-end"
      >
        <AnimatePresence>{errorItems.map(renderToast)}</AnimatePresence>
      </div>

      {/* Success/info toasts: polite live region */}
      <div
        role="status"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 top-20 z-[130] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:top-6 sm:items-end"
      >
        <AnimatePresence>{otherItems.map(renderToast)}</AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}