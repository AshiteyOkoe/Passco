import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getAdminDashboard, getStudents } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users, FileText, Library, BarChart3, GraduationCap, CheckCircle2,
  XCircle, Clock, Search, Building2,
} from 'lucide-react';
import { cn } from '../utils';
import { AdminPanel } from '../components/icons/Illustrations';
import { bounceIn, fadeUp, slideUp, stagger } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import type { AdminStats } from '../types';

interface Student {
  id: string;
  name: string;
  email: string;
  institution?: string;
  gradeLevel?: string;
  quizzesTaken: number;
  avgScore: number;
  documentsUploaded: number;
  createdAt: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'avgScore' | 'quizzesTaken' | 'createdAt'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    Promise.all([getAdminDashboard(), getStudents()])
      .then(([d, s]) => {
        setData(d);
        setStudents(s.students);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    const result = students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.institution && s.institution.toLowerCase().includes(q))
    );
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return result;
  }, [students, search, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <AnimatedSpinner label="Loading dashboard..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <XCircle className="mb-3 h-10 w-10 text-rose-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Failed to load dashboard</p>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="p-4 sm:p-6">
      <motion.div
        className="mb-6"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <AdminPanel className="hidden sm:block" size="sm" />
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome back. Here's your platform overview.</p>
      </motion.div>

      {user?.dateOfBirth && (() => {
        const today = new Date();
        const dob = new Date(user.dateOfBirth);
        if (dob.getUTCMonth() === today.getMonth() && dob.getUTCDate() === today.getDate()) {
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-5 dark:border-amber-800 dark:from-amber-950/40 dark:via-yellow-950/40 dark:to-orange-950/40"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-lg shadow-amber-500/25">🎂</div>
                <div>
                  <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200">Happy Birthday, {user?.name?.split(' ')[0]}! 🎉</h2>
                  <p className="text-sm text-amber-700/80 dark:text-amber-300/80">From all of us at Passco, we wish you a wonderful day filled with joy!</p>
                </div>
              </div>
            </motion.div>
          );
        }
        return null;
      })()}

      <motion.div
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <StatCard icon={Users} value={stats.totalStudents} label="Students" color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" to="/admin/student-performance" />
        <StatCard icon={GraduationCap} value={stats.totalQuizzes} label="Quizzes" color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" to="/admin/create-quiz" />
        <StatCard icon={Library} value={stats.totalQuestions} label="Questions" color="text-violet-500" bg="bg-violet-50 dark:bg-violet-500/10" to="/admin/jhs-questions" />
        <StatCard icon={FileText} value={stats.totalDocuments} label="Documents" color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" to="/admin/files" />
        <StatCard icon={Clock} value={stats.pendingQuestions} label="Pending Review" color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10" to="/admin/jhs-questions" />
        <StatCard icon={BarChart3} value={stats.totalResults} label="Results" color="text-rose-500" bg="bg-rose-50 dark:bg-rose-500/10" to="/admin/analytics" />
      </motion.div>

      <motion.div
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6"
        variants={slideUp}
        initial="hidden"
        animate="visible"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <Users className="h-4 w-4 text-indigo-500" />
            Students
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {filteredStudents.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
              />
            </div>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <Users className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {search ? 'No students match your search.' : 'No students yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    {[
                      { key: 'name' as const, label: 'Student' },
                      { key: 'name' as const, label: 'Institution' },
                      { key: 'quizzesTaken' as const, label: 'Quizzes' },
                      { key: 'avgScore' as const, label: 'Avg Score' },
                      { key: 'name' as const, label: 'Documents' },
                      { key: 'createdAt' as const, label: 'Joined' },
                    ].map((col, i) => (
                      <th
                        key={i}
                        className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  <AnimatePresence>
                    {filteredStudents.map((student, i) => (
                      <motion.tr
                        key={student.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.03, duration: 0.25 }}
                        className="group"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{student.name}</p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-600 dark:text-slate-400">{student.institution || '-'}</span>
                          </div>
                          {student.gradeLevel && (
                            <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              {student.gradeLevel}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.quizzesTaken}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={cn(
                            'text-sm font-bold',
                            student.avgScore >= 75 ? 'text-emerald-500' : student.avgScore >= 50 ? 'text-amber-500' : 'text-rose-500'
                          )}>
                            {student.avgScore}%
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{student.documentsUploaded}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 lg:hidden">
              {filteredStudents.map((student, i) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-bold text-white">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{student.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{student.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-900">
                      <p className="text-lg font-bold text-slate-800 dark:text-white">{student.quizzesTaken}</p>
                      <p className="text-[10px] text-slate-500">Quizzes</p>
                    </div>
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-900">
                      <p className={cn(
                        'text-lg font-bold',
                        student.avgScore >= 75 ? 'text-emerald-500' : student.avgScore >= 50 ? 'text-amber-500' : 'text-rose-500'
                      )}>
                        {student.avgScore}%
                      </p>
                      <p className="text-[10px] text-slate-500">Avg Score</p>
                    </div>
                    <div className="rounded-lg bg-white p-2 dark:bg-slate-900">
                      <p className="text-lg font-bold text-slate-800 dark:text-white">{student.documentsUploaded}</p>
                      <p className="text-[10px] text-slate-500">Docs</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <FileText className="h-4 w-4 text-blue-500" />
            Recent Documents
          </h2>
          {data.recentDocuments.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <FileText className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentDocuments.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    doc.status === 'ready' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : doc.status === 'failed' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  )}>
                    {doc.status === 'ready' ? <CheckCircle2 className="h-4 w-4" /> : doc.status === 'failed' ? <XCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{doc.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">by {doc.uploadedBy}</p>
                  </div>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <BarChart3 className="h-4 w-4 text-rose-500" />
            Recent Results
          </h2>
          {data.recentResults.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <BarChart3 className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">No quiz results yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentResults.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    r.score >= 75 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                  )}>
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{r.studentName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{r.quizTitle}</p>
                  </div>
                  <span className={cn(
                    'text-sm font-bold',
                    r.score >= 75 ? 'text-emerald-500' : 'text-amber-500'
                  )}>
                    {r.score}%
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color, bg, to }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string; color: string; bg: string; to: string }) {
  return (
    <Link to={to}>
      <motion.div
        variants={bounceIn}
        whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition hover:ring-2 hover:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-900"
      >
      <motion.div
        className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', bg)}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
      >
        <Icon className={cn('h-5 w-5', color)} />
      </motion.div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </motion.div>
    </Link>
  );
}
