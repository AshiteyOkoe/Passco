import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

interface MobileStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
  trend?: string;
  delay?: number;
}

export function MobileStatCard({ icon: Icon, label, value, color = 'indigo', trend, delay = 0 }: MobileStatCardProps) {
  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-100 dark:ring-indigo-800' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/15', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-100 dark:ring-emerald-800' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-500/15', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-100 dark:ring-amber-800' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-100 dark:ring-rose-800' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-500/15', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-100 dark:ring-violet-800' },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className={`flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.bg} ring-1 ${c.ring}`}>
        <Icon className={`h-5 w-5 ${c.text}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{label}</p>
        <p className="text-lg font-bold text-slate-900 dark:text-white">{value}</p>
        {trend && (
          <p className="text-[10px] font-medium text-emerald-500">{trend}</p>
        )}
      </div>
    </motion.div>
  );
}

interface MobileQuickActionProps {
  icon: LucideIcon;
  label: string;
  to: string;
  color?: string;
  delay?: number;
}

export function MobileQuickAction({ icon: Icon, label, to, color = 'indigo', delay = 0 }: MobileQuickActionProps) {
  const colorMap: Record<string, { bg: string; text: string; shadow: string }> = {
    indigo: { bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600', text: 'text-white', shadow: 'shadow-indigo-500/25' },
    emerald: { bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600', text: 'text-white', shadow: 'shadow-emerald-500/25' },
    amber: { bg: 'bg-gradient-to-br from-amber-500 to-amber-600', text: 'text-white', shadow: 'shadow-amber-500/25' },
    rose: { bg: 'bg-gradient-to-br from-rose-500 to-rose-600', text: 'text-white', shadow: 'shadow-rose-500/25' },
    violet: { bg: 'bg-gradient-to-br from-violet-500 to-violet-600', text: 'text-white', shadow: 'shadow-violet-500/25' },
    slate: { bg: 'bg-gradient-to-br from-slate-500 to-slate-600', text: 'text-white', shadow: 'shadow-slate-500/25' },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <motion.a
      href={to}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      whileTap={{ scale: 0.95 }}
      className={`flex flex-col items-center justify-center gap-2 rounded-2xl ${c.bg} p-4 shadow-lg ${c.shadow} transition-transform touch-target`}
    >
      <Icon className={`h-6 w-6 ${c.text}`} />
      <span className={`text-xs font-semibold ${c.text}`}>{label}</span>
    </motion.a>
  );
}
