import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  BookOpen, Home, BarChart3, FileText, Library, PlusCircle,
  Users, LogOut, Menu, X, GraduationCap, Sun, Moon, ClipboardCheck, History,
  Building2, BookMarked, HelpCircle, TrendingUp, FileUp, User, ChevronDown, Award, Crown
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DefaultAvatar } from './DefaultAvatars';
import { resolveUploadUrl } from '../services/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const isAdmin = user?.role === 'admin';

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/assessment/setup', label: 'Assessment', icon: ClipboardCheck },
    { to: '/analytics', label: 'My Analytics', icon: BarChart3 },
    { to: '/analytics/performance', label: 'Performance', icon: TrendingUp },
    { to: '/achievements', label: 'Achievements', icon: Award },
    { to: '/assessment/history', label: 'Results History', icon: History },
    { to: '/profile', label: 'My Profile', icon: User },
  ];

  const adminLinks = [
    { to: '/admin', label: 'Admin Dashboard', icon: Users },
    { to: '/admin/classes', label: 'JHS Classes', icon: Building2 },
    { to: '/admin/subjects', label: 'Subjects', icon: BookMarked },
    { to: '/admin/jhs-questions', label: 'JHS Questions', icon: HelpCircle },
    { to: '/admin/bulk-upload', label: 'Bulk Upload', icon: FileUp },
    { to: '/admin/student-performance', label: 'Student Performance', icon: TrendingUp },
    { to: '/admin/files', label: 'All Files', icon: FileText },
    { to: '/admin/questions', label: 'Question Bank', icon: Library },
    { to: '/admin/create-quiz', label: 'Create Quiz', icon: PlusCircle },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/certificates', label: 'Certificates', icon: Crown },
    { to: '/profile', label: 'My Profile', icon: User },
  ];

  const links = isAdmin ? adminLinks : studentLinks;

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

  const hasCustomAvatar = user?.avatar && user.avatar.startsWith('/uploads/');
  const avatarGender = resolveAvatarGender();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 sm:hidden dark:bg-slate-800 dark:text-slate-400"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/" className="flex items-center gap-2.5">
              <img
                src="/images/logos/yes.jpg"
                alt="Passco"
                className="h-12 w-auto object-contain mix-blend-multiply transition-transform hover:scale-110 dark:mix-blend-screen sm:h-14 md:h-16"
              />
            </Link>
            {isAdmin && (
              <span className="ml-2 rounded-lg bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                Admin
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {hasCustomAvatar ? (
                  <img src={resolveUploadUrl(user!.avatar!)} alt={user?.name} className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-700" />
                ) : (
                  <DefaultAvatar gender={avatarGender} size={32} className="rounded-full ring-2 ring-slate-200 dark:ring-slate-700" />
                )}
                <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 md:inline">{user?.name}</span>
                <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition-transform md:inline ${profileOpen ? 'rotate-180' : ''}`} />
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
                    {/* Profile Header */}
                    <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        {hasCustomAvatar ? (
                          <img src={resolveUploadUrl(user!.avatar!)} alt={user?.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-200 dark:ring-indigo-800" />
                        ) : (
                          <DefaultAvatar gender={avatarGender} size={48} className="rounded-full ring-2 ring-indigo-200 dark:ring-indigo-800" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Profile Details */}
                    <div className="px-5 py-3">
                      {profileDetails.map((item) => (
                        <div key={item.label} className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-slate-400 dark:text-slate-500">{item.label}</span>
                          <span className="max-w-[160px] truncate text-xs font-medium text-slate-700 dark:text-slate-200">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                      <Link
                        to="/profile"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <User className="h-4 w-4" />
                        Edit Profile
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
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'fixed inset-y-16 left-0 z-40 w-64' : 'hidden'} sm:relative sm:flex sm:w-64 sm:shrink-0 border-r border-slate-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950`}>
          <nav className="w-full p-4">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to || (link.to !== '/dashboard' && location.pathname.startsWith(link.to));
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all mb-1 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/30 sm:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <main className="min-h-[calc(100vh-4rem)] flex-1">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} Passco. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/about" className="text-xs text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400">
              About
            </Link>
            <Link to="/contact" className="text-xs text-slate-400 hover:text-indigo-500 dark:text-slate-500 dark:hover:text-indigo-400">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
