import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/animations';
import { cn } from '../../utils';

interface WelcomeStripProps {
  name?: string;
  processing: number;
  failed: number;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomeStrip({ name, processing, failed }: WelcomeStripProps) {
  const status = failed > 0
    ? { dot: 'bg-rose-500', text: `${failed} file job${failed === 1 ? '' : 's'} failed — requires attention` }
    : processing > 0
      ? { dot: 'bg-amber-500', text: `${processing} file${processing === 1 ? '' : 's'} currently processing` }
      : { dot: 'bg-emerald-500', text: 'All systems operational' };

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {getGreeting()}, {name?.split(' ')[0] || 'Admin'} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · Here's what's happening across PASSCO today.
        </p>
      </div>
      <div className="flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-800">
        <span className={cn('h-2.5 w-2.5 rounded-full', status.dot)} />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          <span className="hidden sm:inline">●</span> {status.text}
        </span>
      </div>
    </motion.div>
  );
}