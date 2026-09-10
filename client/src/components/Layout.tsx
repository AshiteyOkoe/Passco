import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useTheme } from '../context/ThemeContext';
import {
  Home, BarChart3, FileText, Library,
  LogOut, Sun, Moon, ClipboardCheck, History,
  Building2, BookMarked, HelpCircle, TrendingUp, FileUp, User, Award, Gem,
  Sparkles, CreditCard, LayoutDashboard, Quote, Settings, MessageSquare, Flag, Menu, X, ClipboardList, Trophy
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DefaultAvatar } from './DefaultAvatars';
import { resolveUploadUrl, isCustomAvatar } from '../services/api';
import InstallPrompt from './InstallPrompt';
import MobileBottomNav from './MobileBottomNav';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const { user, logout } = useAuth();
  const { isPremium, isTrial, trialDaysLeft, loading: subLoading } = useSubscription();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = user?.role === 'admin';

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/assessment/setup', label: 'Assessment', icon: ClipboardCheck },
    { to: '/analytics', label: 'My Analytics', icon: BarChart3 },
    { to: '/analytics/performance', label: 'Performance', icon: TrendingUp },
    { to: '/results-dashboard', label: 'Results Dashboard', icon: LayoutDashboard },
    { to: '/achievements', label: 'Achievements', icon: Award },
    { to: '/competitions', label: 'Competitions', icon: Trophy },
    { to: '/assessment/history', label: 'Results History', icon: History },
    { to: '/reports', label: 'Report Cards', icon: FileText },
    { to: '/subscription', label: 'Subscription', icon: CreditCard },
    { to: '/profile', label: 'My Profile', icon: User },
  ];

  const bottomTabPaths = isAdmin
    ? ['/admin', '/admin/questions', '/admin/ai-generator', '/admin/analytics', '/profile']
    : ['/dashboard', '/competitions', '/assessment/setup', '/analytics', '/profile'];

  const adminGroups = [
    {
      title: 'Dashboard',
      links: [{ to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard }],
    },
    {
      title: 'Academics',
      links: [
        { to: '/admin/classes', label: 'JHS Classes', icon: Building2 },
        { to: '/admin/subjects', label: 'Subjects', icon: BookMarked },
      ],
    },
    {
      title: 'Assessments',
      links: [
        { to: '/admin/jhs-questions', label: 'JHS Questions', icon: HelpCircle },
        { to: '/admin/questions', label: 'Question Bank', icon: Library },
        { to: '/admin/ai-generator', label: 'AI Generator', icon: Sparkles },
        { to: '/admin/competitions', label: 'Competitions', icon: Trophy },
      ],
    },
    {
      title: 'Resources',
      links: [
        { to: '/admin/bulk-upload', label: 'Bulk Upload', icon: FileUp },
        { to: '/admin/testimonials', label: 'Testimonials', icon: Quote },
      ],
    },
    {
      title: 'Analytics & Finance',
      links: [
        { to: '/admin/analytics', label: 'Reports', icon: BarChart3 },
        { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
      ],
    },
    {
      title: 'Academic Reports',
      links: [
        { to: '/admin/document-requests', label: 'Document Requests', icon: ClipboardList },
        { to: '/admin/reports', label: 'Report Cards', icon: FileText },
        { to: '/admin/report-settings', label: 'Report Settings', icon: Settings },
      ],
    },
    {
      title: 'Support',
      links: [
        { to: '/admin/support', label: 'Contact & Reports', icon: MessageSquare },
        { to: '/admin/certificates', label: 'Certificate Settings', icon: Award },
        { to: '/profile', label: 'My Profile', icon: User },
      ],
    },
  ];

  const links = isAdmin ? adminGroups.flatMap((g) => g.links) : studentLinks;

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/');
  };

  const profileDetails = [
    { label: 'Student Name', value: user?.name },
    { label: 'Email', value: user?.email },
    { label: 'Gender', value: user?.gender ? (user.gender === 'male' ? 'Male' : 'Female') : 'Not set' },
    { label: 'Date of Birth', value: user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not set' },
    { label: 'School', value: user?.institution || 'Not set' },
    { label: 'Class', value: user?.classLevel || user?.gradeLevel || 'Not set' },
  ];

  const resolveAvatarGender = (): 'male' | 'female' | '' => {
    if (user?.avatar === 'avatar:male') return 'male';
    if (user?.avatar === 'avatar:female') return 'female';
    return (user?.gender as 'male' | 'female') || '';
  };

  const hasCustomAvatar = isCustomAvatar(user?.avatar);
  const avatarGender = resolveAvatarGender();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl safe-area-top transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 sm:hidden dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label={isAdmin ? 'Open admin menu' : 'Open menu'}
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/images/logos/qna.svg"
                alt="Passco"
                className="h-12 w-auto object-contain mix-blend-multiply transition-transform hover:scale-110 dark:mix-blend-screen sm:h-14 md:h-16"
              />
            </Link>
            {isAdmin && (
              <span className="ml-2 hidden rounded-lg bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-600 sm:inline dark:bg-blue-500/10 dark:text-blue-400">
                Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />

            <motion.button
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              whileTap={{ scale: 0.85 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {dark ? (
                  <motion.div key="sun" initial={{ rotate: -90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
                    <Sun className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div key="moon" initial={{ rotate: 90, opacity: 0, scale: 0.5 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: -90, opacity: 0, scale: 0.5 }} transition={{ duration: 0.3, ease: 'easeInOut' }}>
                    <Moon className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {!isAdmin && !subLoading && (
              <Link
                to="/subscription"
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  isPremium
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                <Gem className="h-3.5 w-3.5" />
                {isPremium
                  ? isTrial && trialDaysLeft > 0
                    ? `Premium · ${trialDaysLeft}d left`
                    : 'Premium'
                  : 'Go Premium'}
              </Link>
            )}

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className={`flex h-9 w-9 items-center justify-center rounded-full transition ${profileOpen ? 'ring-2 ring-blue-300 dark:ring-blue-600' : 'hover:ring-2 hover:ring-blue-200 dark:hover:ring-blue-800'}`}
                aria-label="Profile menu"
              >
                {hasCustomAvatar ? (
                  <img src={resolveUploadUrl(user!.avatar!)} alt={user?.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-blue-200 dark:ring-blue-800" />
                ) : (
                  <DefaultAvatar gender={avatarGender} size={36} className="rounded-full ring-2 ring-blue-200 dark:ring-blue-800" />
                )}
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        {hasCustomAvatar ? (
                          <img src={resolveUploadUrl(user!.avatar!)} alt={user?.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-200 dark:ring-blue-800" />
                        ) : (
                          <DefaultAvatar gender={avatarGender} size={48} className="rounded-full ring-2 ring-blue-200 dark:ring-blue-800" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3">
                      {profileDetails.map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-slate-400 dark:text-slate-500">{item.label}</span>
                          <span className="max-w-[160px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                      <Link
                        to={isAdmin ? '/admin/profile' : '/profile'}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <User className="h-4 w-4" />
                        View Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </div>
        </div>
      </nav>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        {/* Sidebar - hidden on mobile, visible on sm+ */}
        <aside className="hidden sm:flex sm:w-64 sm:shrink-0 border-r border-slate-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950">
          <nav className="w-full p-4">
            {isAdmin ? (
              adminGroups.map((group) => (
                <div key={group.title} className="mb-2">
                  <p className="mb-1 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {group.title}
                  </p>
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.to || (link.to !== '/admin' && location.pathname.startsWith(link.to));
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-all mb-0.5 ${
                          isActive
                            ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/10 dark:text-blue-400'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              ))
            ) : (
              links.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.to || (link.to !== '/dashboard' && location.pathname.startsWith(link.to));
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all mb-1 ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/10 dark:text-blue-400'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </Link>
                );
              })
            )}

            {!isAdmin && !subLoading && (
              <div className={`mt-4 rounded-xl p-4 ${isPremium ? 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' : 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white'}`}>
                <div className="flex items-center gap-2">
                  <Gem className={`h-5 w-5 ${isPremium ? 'text-amber-500' : 'text-amber-300'}`} />
                  <p className={`text-sm font-bold ${isPremium ? 'text-amber-800 dark:text-amber-300' : ''}`}>
                    {isPremium ? 'Premium Active' : 'Go Premium'}
                  </p>
                </div>
                <p className={`mt-1 text-xs leading-relaxed ${isPremium ? 'text-amber-700/80 dark:text-amber-200/70' : 'text-blue-100'}`}>
                  {isPremium
                    ? isTrial
                      ? `Free trial active — ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left.`
                      : 'All premium features unlocked.'
                    : 'Unlock mock exams, examinations & longer AI access.'}
                </p>
                <Link
                  to="/subscription"
                  className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    isPremium
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300'
                      : 'bg-white text-indigo-700 hover:bg-blue-50'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  {isPremium ? 'Manage' : 'Subscribe Now'}
                </Link>
              </div>
            )}
          </nav>
        </aside>

        <AnimatePresence>
          {mobileNavOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileNavOpen(false)}
                className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm sm:hidden"
                aria-hidden="true"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="fixed inset-y-0 left-0 z-[70] flex w-72 max-w-[85vw] flex-col overflow-hidden bg-white shadow-2xl sm:hidden dark:bg-slate-950"
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{isAdmin ? 'Admin Menu' : 'Menu'}</p>
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <nav className="flex-1 overflow-y-auto p-3 pb-8">
                  {isAdmin ? (
                    adminGroups
                      .map((group) => ({
                        ...group,
                        links: group.links.filter((link) => !bottomTabPaths.includes(link.to)),
                      }))
                      .filter((group) => group.links.length > 0)
                      .map((group) => (
                      <div key={group.title} className="mb-2">
                        <p className="mb-1 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {group.title}
                        </p>
                        {group.links.map((link) => {
                          const Icon = link.icon;
                          const isActive = location.pathname === link.to || (link.to !== '/admin' && location.pathname.startsWith(link.to));
                          return (
                            <Link
                              key={link.to}
                              to={link.to}
                              onClick={() => setMobileNavOpen(false)}
                              className={`flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium transition-all mb-0.5 ${
                                isActive
                                  ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/10 dark:text-blue-400'
                                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                              {link.label}
                            </Link>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    <div className="mb-2">
                      <p className="mb-1 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Navigation
                      </p>
                      {studentLinks.filter((link) => !bottomTabPaths.includes(link.to)).map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.to || (link.to !== '/dashboard' && location.pathname.startsWith(link.to));
                        return (
                          <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setMobileNavOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all mb-1 ${
                              isActive
                                ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-500/10 dark:text-blue-400'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            {link.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main id="main-content" className="min-h-[calc(100vh-4rem)] min-w-0 flex-1 pb-20 sm:pb-0">
          <Outlet />
        </main>
      </div>

      <MobileBottomNav />
      <InstallPrompt />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950 sm:block">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 sm:text-left">
            &copy; {new Date().getFullYear()} Passco. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-4">
            <Link to="/about" className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-blue-500 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-blue-400 sm:py-2">
              About
            </Link>
            <Link to="/contact" className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-blue-500 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-blue-400 sm:py-2">
              Contact
            </Link>
            <Link to="/faq" className="rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-100 hover:text-blue-500 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-blue-400 sm:py-2">
              FAQ
            </Link>
            <Link to="/contact?subject=Report+a+Question" className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:text-slate-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 sm:py-2">
              <Flag className="h-3 w-3" /> Report Issue
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
