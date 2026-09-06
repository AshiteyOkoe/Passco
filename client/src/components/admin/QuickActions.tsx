import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PlusCircle, FileUp, Sparkles, ClipboardCheck, Users, CreditCard,
  BarChart3, Megaphone,
} from 'lucide-react';

const ACTIONS = [
  { label: 'Create Exam / Quiz', to: '/admin/create-quiz', icon: PlusCircle, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
  { label: 'Add / Review Questions', to: '/admin/questions?status=pending', icon: ClipboardCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { label: 'Bulk Upload', to: '/admin/bulk-upload', icon: FileUp, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { label: 'AI Generator', to: '/admin/ai-generator', icon: Sparkles, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  { label: 'Manage Students', to: '/admin/analytics', icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  { label: 'Subscriptions', to: '/admin/subscriptions', icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  { label: 'Announcements', to: '/admin/subscriptions', icon: Megaphone, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
  { label: 'Generate Report', to: '/admin/analytics', icon: BarChart3, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
];

export default function QuickActions() {
  return (
    <motion.div
      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-white">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ACTIONS.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 p-3 transition hover:border-indigo-200 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.bg}`}>
              <a.icon className={`h-4 w-4 ${a.color}`} />
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{a.label}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}