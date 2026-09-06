import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { fadeUp } from '../../utils/animations';
import { cn } from '../../utils';

interface SectionCardProps {
  id?: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}

export default function SectionCard({ id, title, subtitle, icon: Icon, children, className, right }: SectionCardProps) {
  return (
    <motion.section
      id={id}
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className={cn(
        'scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 sm:p-6',
        className
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <Icon className="h-4 w-4" />
            </span>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
          </div>
          {subtitle && (
            <p className="mt-1 pl-[42px] text-xs text-slate-500 dark:text-slate-400 sm:text-sm">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
      {children}
    </motion.section>
  );
}