import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { BookOpen, Sun, Moon, Menu, X, LogOut, User, Flag, Twitter, Facebook, Instagram, Youtube, Mail, MessageCircle, UserPlus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthModal from './AuthModal';
import LegalModal from './LegalModal';
import { DefaultAvatar } from './DefaultAvatars';
import { resolveUploadUrl, isCustomAvatar } from '../services/api';
import InstallPrompt from './InstallPrompt';

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAuth, setShowAuth] = useState<'login' | 'register' | null>(null);
  const [legalDoc, setLegalDoc] = useState<'privacy' | 'terms' | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const publicDetails = [
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

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/features', label: 'Features' },
    { to: '/how-it-works', label: 'How It Works' },
    { to: '/about', label: 'About' },
    { to: '/contact', label: 'Contact' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img
src="/images/logos/qna.svg"
              alt="Passco"
              className="h-12 w-auto object-contain mix-blend-multiply transition-transform hover:scale-110 dark:mix-blend-screen sm:h-14 md:h-16"
            />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isActive(link.to)
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <motion.button
              onClick={toggle}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              whileTap={{ scale: 0.85 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {dark ? (
                  <motion.div
                    key="sun"
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <Sun className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <Moon className="h-5 w-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {user ? (
              <div className="hidden items-center gap-3 md:flex">
                <Link
                  to={user.role === 'admin' ? '/admin' : '/dashboard'}
                  className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-600"
                >
                  Dashboard
                </Link>
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition ${profileOpen ? 'ring-2 ring-indigo-300 dark:ring-indigo-600' : 'hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-800'}`}
                    aria-label="Profile menu"
                  >
                    {hasCustomAvatar ? (
                      <img src={resolveUploadUrl(user.avatar!)} alt={user.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-200 dark:ring-indigo-800" />
                    ) : (
                      <DefaultAvatar gender={avatarGender} size={36} className="rounded-full ring-2 ring-indigo-200 dark:ring-indigo-800" />
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
                              <img src={resolveUploadUrl(user.avatar!)} alt={user.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-200 dark:ring-indigo-800" />
                            ) : (
                              <DefaultAvatar gender={avatarGender} size={48} className="rounded-full ring-2 ring-indigo-200 dark:ring-indigo-800" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 py-3">
                          {publicDetails.map((item) => (
                            <div key={item.label} className="flex items-center justify-between py-1.5">
                              <span className="text-xs text-slate-400 dark:text-slate-500">{item.label}</span>
                              <span className="max-w-[160px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">{item.value}</span>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                          <Link
                            to="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          >
                            <User className="h-4 w-4" />
                            View Profile
                          </Link>
                          <button
                            onClick={() => { setProfileOpen(false); logout(); navigate('/'); }}
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
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <button
                  onClick={() => setShowAuth('register')}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
                >
                  <UserPlus className="h-4 w-4" />
                  Get Started
                </button>
              </div>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 md:hidden dark:text-slate-400"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="absolute inset-x-0 top-full border-b border-slate-200 bg-white shadow-xl md:hidden dark:border-slate-800 dark:bg-slate-950"
            >
              <nav className="max-h-[calc(100vh-4rem)] space-y-1 overflow-y-auto px-4 pb-4 pt-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-lg px-4 py-2.5 text-sm font-medium ${
                      isActive(link.to)
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="my-2 border-slate-200 dark:border-slate-800" />
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      {hasCustomAvatar ? (
                      <img src={resolveUploadUrl(user.avatar!)} alt={user.name} className="h-8 w-8 rounded-full object-cover ring-2 ring-indigo-200 dark:ring-indigo-800" />
                      ) : (
                        <DefaultAvatar gender={avatarGender} size={32} className="rounded-full ring-2 ring-indigo-200 dark:ring-indigo-800" />
                      )}
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</span>
                    </div>
                    <Link
                      to={user.role === 'admin' ? '/admin' : '/dashboard'}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg bg-indigo-500 px-4 py-2.5 text-center text-sm font-semibold text-white"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); navigate('/'); setMobileOpen(false); }}
                      className="block w-full rounded-lg px-4 py-2.5 text-center text-sm font-medium text-slate-600 dark:text-slate-400"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setShowAuth('register'); setMobileOpen(false); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <UserPlus className="h-4 w-4" /> Get Started
                  </button>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      <main id="main-content" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-6">
            <div className="sm:col-span-2 lg:col-span-2">
              <Link to="/" className="flex items-center gap-2">
                <img src="/images/logos/qna.svg" alt="Passco" className="h-10 w-auto object-contain mix-blend-multiply transition-transform hover:scale-110 dark:mix-blend-screen sm:h-12" />
              </Link>
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Prepare smarter. Practice better. Perform better.
              </p>
              <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                A JHS self-examination platform for Ghanaian students. Take assessments, get instant feedback and
                track your progress — all in one place.
              </p>
              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Follow us</p>
                <div className="mt-2 flex items-center gap-2">
                  {[
                    { Icon: Twitter, label: 'Twitter' },
                    { Icon: Facebook, label: 'Facebook' },
                    { Icon: Instagram, label: 'Instagram' },
                    { Icon: Youtube, label: 'YouTube' },
                  ].map(({ Icon, label }) => (
                    <span
                      key={label}
                      title={`${label} — coming soon`}
                      className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-300 opacity-70 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Platform</h3>
              <ul className="mt-3 space-y-2">
                {[
                  { label: 'Features', to: '/features' },
                  { label: 'How It Works', to: '/how-it-works' },
                  { label: 'Subjects', to: '/#subjects' },
                  { label: 'Pricing', to: '/#plans' },
                  { label: 'Demo Quiz', to: '/#demo' },
                ].map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} className="text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Resources</h3>
              <ul className="mt-3 space-y-2">
                {[
                  { label: 'FAQ', to: '/#faq' },
                  { label: 'Leaderboard', to: '/#leaderboard' },
                  { label: 'Testimonials', to: '/#testimonials' },
                  { label: 'About', to: '/about' },
                  { label: 'Contact', to: '/contact' },
                ].map((item) => (
                  <li key={item.label}>
                    <Link to={item.to} className="text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Support</h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link to="/contact" className="text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact?subject=Report+a+Question" className="flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                    <Flag className="h-3.5 w-3.5" /> Report an Issue
                  </Link>
                </li>
                <li className="flex items-center gap-2">
                  <a href="https://wa.me/233207435678" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                    <MessageCircle className="h-3.5 w-3.5" /> +233 20 743 5678
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <a href="mailto:support@passco.app" className="flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                    <Mail className="h-3.5 w-3.5" /> support@passco.app
                  </a>
                </li>
              </ul>
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Legal</h3>
                <ul className="mt-3 space-y-2">
                  <li>
                    <button onClick={() => setLegalDoc('privacy')} className="text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                      Privacy Policy
                    </button>
                  </li>
                  <li>
                    <button onClick={() => setLegalDoc('terms')} className="text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                      Terms of Service
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center gap-1 border-t border-slate-200 pt-8 dark:border-slate-800">
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              &copy; {new Date().getFullYear()} Passco. All rights reserved.
            </p>
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              Made for Ghanaian JHS students.
            </p>
          </div>
        </div>
      </footer>

      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} onSwitch={setLegalDoc} />

      <InstallPrompt />

      <AuthModal
        isOpen={showAuth !== null}
        initialTab={showAuth || 'login'}
        onClose={() => setShowAuth(null)}
      />
    </div>
  );
}
