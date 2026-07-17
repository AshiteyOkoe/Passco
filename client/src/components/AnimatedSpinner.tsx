import { motion } from 'framer-motion';
import { cn } from '../utils';
import { BookOpen } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

export default function AnimatedSpinner({ size = 'md', label, className }: SpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      <motion.div
        className={cn('relative flex items-center justify-center', sizes[size], className)}
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <div className={cn(
          'absolute inset-0 rounded-full border-2 border-transparent',
          'border-t-indigo-500 border-r-indigo-400/60 border-b-indigo-300/30 border-l-indigo-500/40',
        )} />
        <BookOpen className={cn(
          size === 'sm' ? 'h-3.5 w-3.5' : size === 'md' ? 'h-5 w-5' : 'h-7 w-7',
          'text-indigo-600 dark:text-indigo-400',
        )} />
      </motion.div>
      {label && (
        <motion.p
          className="text-sm text-slate-500 dark:text-slate-400"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {label}
        </motion.p>
      )}
      <span className="sr-only">{label || 'Loading'}</span>
    </div>
  );
}
