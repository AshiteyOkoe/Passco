import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { bounceIn } from '../../utils/animations';

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  delta?: number;
  deltaSuffix?: string;
  to?: string;
  color?: string;
  bg?: string;
  caption?: string;
  delay?: number;
}

export default function KpiCard({ icon: Icon, value, label, delta, deltaSuffix = '%', to, color = 'text-indigo-500', bg = 'bg-indigo-50 dark:bg-indigo-500/10', caption, delay = 0 }: KpiCardProps) {
  const showDelta = typeof delta === 'number';
  const movingUp = (delta || 0) >= 0;

  const body = (
    <motion.div
      variants={bounceIn}
      whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition hover:ring-2 hover:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900"
      transition={delay ? { delay } : undefined}
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {(showDelta || caption) && (
        <div className="mt-2 flex items-center gap-1.5">
          {showDelta && (
            <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${movingUp ? 'text-emerald-500' : 'text-rose-500'}`}>
              {movingUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {movingUp ? '+' : ''}{delta}{deltaSuffix}
            </span>
          )}
          {caption && <span className="text-[11px] text-slate-400 dark:text-slate-500">{caption}</span>}
        </div>
      )}
    </motion.div>
  );

  return to ? <Link to={to}>{body}</Link> : body;
}