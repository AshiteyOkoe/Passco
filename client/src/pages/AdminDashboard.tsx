import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAdminCommandCenter, getStudents } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users, FileText, Library, CheckCircle2, XCircle, Clock, Search, Building2,
  GraduationCap, BookOpen, Wallet, CreditCard, HelpCircle,
} from 'lucide-react';
import { cn } from '../utils';
import { fadeUp, slideUp, stagger } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import WelcomeStrip from '../components/admin/WelcomeStrip';
import KpiCard from '../components/admin/KpiCard';
import ActivityChart from '../components/admin/ActivityChart';
import ExamPerformanceCard from '../components/admin/ExamPerformanceCard';
import SubjectPerformanceTable from '../components/admin/SubjectPerformanceTable';
import PendingActions from '../components/admin/PendingActions';
import QuestionBankCard from '../components/admin/QuestionBankCard';
import ContentPipelineCard from '../components/admin/ContentPipelineCard';
import SubscriptionsOverviewCard from '../components/admin/SubscriptionsOverviewCard';
import RecentActivityFeed from '../components/admin/RecentActivityFeed';
import QuickActions from '../components/admin/QuickActions';
import type { AdminCommandCenter } from '../types';

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
  const [data, setData] = useState<AdminCommandCenter | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'avgScore' | 'quizzesTaken' | 'createdAt'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    Promise.all([getAdminCommandCenter(30), getStudents()])
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

  const { page, totalPages, pageItems, goTo } = usePagination(filteredStudents, 8);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <AnimatedSpinner label="Loading command center..." />
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

  const { kpis, assessment, subjects, questionBank, pipeline, subscriptionOverview, pendingActions, recentActivity } = data;

  return (
    <div className="overflow-x-hidden p-4 sm:p-6">
      <WelcomeStrip name={user?.name} processing={pipeline.processing + pipeline.queued} failed={pipeline.failed} />

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
        className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <KpiCard icon={Users} value={kpis.students.value} label="Students" delta={kpis.students.delta} caption="this month" color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" to="/admin/analytics" />
        <KpiCard icon={BookOpen} value={kpis.results.value} label="Exams Taken" delta={kpis.results.delta} caption="vs last month" color="text-rose-500" bg="bg-rose-50 dark:bg-rose-500/10" to="/admin/analytics" />
        <KpiCard icon={Library} value={kpis.questions.value} label="Questions" delta={kpis.questions.delta} caption="this week" color="text-violet-500" bg="bg-violet-50 dark:bg-violet-500/10" to="/admin/jhs-questions" />
        <KpiCard icon={FileText} value={kpis.documents.value} label="Resources" delta={kpis.documents.delta} caption="this month" color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" to="/admin/files" />
        <KpiCard icon={HelpCircle} value={kpis.pendingQuestions} label="Pending Review" caption="awaiting approval" color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10" to="/admin/questions?status=pending" />
        <KpiCard icon={CreditCard} value={kpis.activeSubscriptions} label="Active Subs" caption="paid plans" color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" to="/admin/subscriptions" />
        <KpiCard icon={Wallet} value={kpis.revenueThisMonth} label="Revenue (GH₵)" caption="this month" color="text-cyan-500" bg="bg-cyan-50 dark:bg-cyan-500/10" to="/admin/subscriptions" />
      </motion.div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityChart />
        </div>
        <PendingActions actions={pendingActions} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <motion.div variants={slideUp} initial="hidden" animate="visible" className="min-w-0">
          <ExamPerformanceCard assessment={assessment} />
        </motion.div>
        <motion.div variants={slideUp} initial="hidden" animate="visible" className="min-w-0">
          <SubjectPerformanceTable subjects={subjects} />
        </motion.div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <motion.div variants={slideUp} initial="hidden" animate="visible" className="min-w-0">
          <QuestionBankCard total={kpis.questions.value} breakdown={questionBank} />
        </motion.div>
        <motion.div variants={slideUp} initial="hidden" animate="visible" className="min-w-0">
          <ContentPipelineCard pipeline={pipeline} />
        </motion.div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <motion.div variants={slideUp} initial="hidden" animate="visible" className="min-w-0">
          <SubscriptionsOverviewCard overview={subscriptionOverview} />
        </motion.div>
        <motion.div variants={slideUp} initial="hidden" animate="visible" className="min-w-0">
          <RecentActivityFeed items={recentActivity} />
        </motion.div>
      </div>

      <div className="mb-8">
        <QuickActions />
      </div>

      <motion.div
        className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6"
        variants={slideUp}
        initial="hidden"
        animate="visible"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <Users className="h-4 w-4 text-indigo-500" />
            User Management — Students
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
            <Link
              to="/admin/analytics"
              className="hidden rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-indigo-400 sm:block"
            >
              Manage Users
            </Link>
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
          <div className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {[
                    { key: 'name' as const, label: 'Student' },
                    { key: 'name' as const, label: 'Institution' },
                    { key: 'quizzesTaken' as const, label: 'Quizzes' },
                    { key: 'avgScore' as const, label: 'Avg Score' },
                    { key: 'name' as const, label: 'Documents' },
                    { key: 'createdAt' as const, label: 'Joined' },
                  ].map((col) => (
                    <th
                      key={col.label}
                      className="cursor-pointer pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      onClick={() => toggleSort(col.key as typeof sortField)}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {pageItems.map((student) => (
                  <tr key={student.id} className="group">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>

          <div className="grid gap-3 md:hidden">
            {pageItems.map((student) => (
              <div
                key={student.id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{student.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{student.email}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">{student.institution || '-'}</span>
                      {student.gradeLevel && (
                        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {student.gradeLevel}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Quizzes</dt>
                    <dd className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.quizzesTaken}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Avg Score</dt>
                    <dd className={cn(
                      'text-sm font-bold',
                      student.avgScore >= 75 ? 'text-emerald-500' : student.avgScore >= 50 ? 'text-amber-500' : 'text-rose-500'
                    )}>
                      {student.avgScore}%
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Documents</dt>
                    <dd className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.documentsUploaded}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">Joined</dt>
                    <dd className="text-sm text-slate-600 dark:text-slate-400">{new Date(student.createdAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filteredStudents.length}
            perPage={8}
            onPageChange={goTo}
            className="mt-5"
          />
          </>
        )}

        <div className="mt-5 flex justify-end lg:hidden">
          <Link
            to="/admin/analytics"
            className="flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
          >
            Manage Users
          </Link>
        </div>
      </motion.div>

      <motion.p variants={fadeUp} initial="hidden" animate="visible" className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400 dark:text-slate-500">
        <GraduationCap className="h-3.5 w-3.5" />
        <span>{pendingActions.length > 0 ? `${pendingActions.length} item${pendingActions.length === 1 ? '' : 's'} need your attention` : 'Everything is up to date'} — PASSCO Command Center</span>
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
      </motion.p>
    </div>
  );
}