import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { motion } from 'framer-motion';
import {
  Home, BookOpen, ClipboardCheck, BarChart3, User,
  LayoutDashboard, Users, Sparkles, Gem, Trophy,
} from 'lucide-react';

const studentTabs = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/competitions', label: 'Competitions', icon: Trophy },
  { to: '/assessment/setup', label: 'Assess', icon: ClipboardCheck },
  { to: '/analytics', label: 'Stats', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
];

const adminTabs = [
  { to: '/admin', label: 'Home', icon: Home },
  { to: '/admin/questions', label: 'Bank', icon: BookOpen },
  { to: '/admin/ai-generator', label: 'AI Gen', icon: Sparkles },
  { to: '/admin/analytics', label: 'Stats', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: User },
];

export default function MobileBottomNav() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const location = useLocation();
  const tabs = user?.role === 'admin' ? adminTabs : studentTabs;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-xl safe-area-bottom sm:hidden dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.to || (tab.to !== '/dashboard' && tab.to !== '/admin' && location.pathname.startsWith(tab.to));
          const showPremium = user?.role === 'student' && !isPremium && tab.to === '/assessment/setup';
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className="relative flex flex-col items-center justify-center px-3 py-2 min-w-[60px] touch-target"
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-colors duration-200 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {showPremium && (
                  <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400">
                    <Gem className="h-2.5 w-2.5 text-white" />
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId="mobile-tab-indicator"
                    className="absolute -bottom-1 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-blue-600 dark:bg-blue-400"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span
                className={`mt-1 text-[10px] font-medium transition-colors duration-200 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
