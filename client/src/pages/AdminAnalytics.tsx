import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAdminAnalytics, getStudents, getAdminStudentDetail } from '../services/api';
import {
  BarChart3, Users, GraduationCap, TrendingUp, Trophy, Target, BookOpen,
  Download, Activity, ArrowLeft, FileText, Calendar, Building2, Mail,
  Clock, CheckCircle2,
} from 'lucide-react';
import { cn } from '../utils';
import { AnalyticsChart } from '../components/icons/Illustrations';
import { bounceIn, fadeUp, slideUp, stagger } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';

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

interface StudentDetail {
  student: {
    id: string;
    name: string;
    email: string;
    institution?: string;
    gradeLevel?: string;
    createdAt: string;
  };
  results: Array<{
    _id: string;
    quizId: string | { _id: string; title: string };
    score: number;
    totalQuestions: number;
    correctCount: number;
    completedAt: string;
  }>;
  documents: Array<{
    id: string;
    originalName: string;
    fileSize: number;
    status: string;
    createdAt: string;
  }>;
  stats: {
    totalQuizzes: number;
    averageScore: number;
    totalDocuments: number;
  };
}

export default function AdminAnalytics() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('student');

  const [analytics, setAnalytics] = useState<{
    totalQuizzes: number;
    averageScore: number;
    scoreDistribution: Array<{ _id: string; count: number }>;
    resultsByDay: Array<{ date: string; count: number; avgScore: number }>;
  } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(false);

  useEffect(() => {
    if (studentId) {
      setStudentLoading(true);
      getAdminStudentDetail(studentId)
        .then(setStudentDetail)
        .catch(console.error)
        .finally(() => setStudentLoading(false));
    } else {
      setStudentDetail(null);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) return;
    setLoading(true);
    Promise.all([getAdminAnalytics(), getStudents()])
      .then(([a, s]) => {
        setAnalytics(a);
        setStudents(s.students);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  const handleExport = () => {
    let csv = 'Student Name,Email,Institution,Grade Level,Quizzes Taken,Average Score,Documents Uploaded,Joined\n';
    students.forEach((s) => {
      csv += `"${s.name}","${s.email}","${s.institution || ''}","${s.gradeLevel || ''}",${s.quizzesTaken},${s.avgScore},${s.documentsUploaded},"${new Date(s.createdAt).toLocaleDateString()}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'passco-student-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (studentId && studentLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <AnimatedSpinner label="Loading student report..." />
      </div>
    );
  }

  if (studentId && studentDetail) {
    return <StudentReport detail={studentDetail} onBack={() => window.history.back()} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <AnimatedSpinner label="Loading analytics..." />
      </div>
    );
  }

  const topStudents = [...students].sort((a, b) => b.avgScore - a.avgScore).slice(0, 10);
  const maxCount = analytics ? Math.max(...analytics.scoreDistribution.map((d) => d.count), 1) : 1;

  return (
    <div className="p-4 sm:p-6">
      <motion.div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        </div>
        <div className="flex items-center gap-3">
          <AnalyticsChart className="hidden sm:block" size="sm" />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
          >
            <Download className="h-4 w-4" /> Export CSV
          </motion.button>
        </div>
      </motion.div>

      {analytics && (
        <motion.div
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <Metric icon={BarChart3} value={analytics.totalQuizzes} label="Total Quizzes" color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" />
          <Metric icon={TrendingUp} value={`${analytics.averageScore}%`} label="Average Score" color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" />
          <Metric icon={Users} value={students.length} label="Total Students" color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10" />
          <Metric icon={Trophy} value={students.filter((s) => s.avgScore >= 75).length} label="Top Performers" color="text-violet-500" bg="bg-violet-50 dark:bg-violet-500/10" />
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {analytics && analytics.scoreDistribution.length > 0 && (
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Target className="h-4 w-4 text-indigo-500" /> Score Distribution
            </h3>
            <div className="space-y-3">
              {[
                { range: '0-24%', key: '0', color: 'bg-rose-500' },
                { range: '25-49%', key: '25', color: 'bg-orange-500' },
                { range: '50-59%', key: '50', color: 'bg-amber-500' },
                { range: '60-74%', key: '60', color: 'bg-yellow-500' },
                { range: '75-89%', key: '75', color: 'bg-indigo-500' },
                { range: '90-100%', key: '90', color: 'bg-emerald-500' },
              ].map(({ range, key, color }, i) => {
                const item = analytics.scoreDistribution.find((d) => d._id === key);
                const count = item?.count ?? 0;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.35 }}
                  >
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{range}</span>
                      <span className="font-medium text-slate-800 dark:text-white">{count}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        className={cn('h-full rounded-full', color)}
                        initial={{ width: '0%' }}
                        animate={{ width: `${(count / maxCount) * 100}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <GraduationCap className="h-4 w-4 text-indigo-500" /> Top Performing Students
          </h3>
          <div className="space-y-3">
            {topStudents.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <motion.span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                    i < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  )}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, delay: i * 0.05 }}
                >
                  {i + 1}
                </motion.span>
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/analytics?student=${s.id}`} className="truncate text-sm font-medium text-slate-800 hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
                    {s.name}
                  </Link>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.quizzesTaken} quizzes · {s.institution || 'N/A'}</p>
                </div>
                <span className={cn(
                  'text-sm font-bold',
                  s.avgScore >= 75 ? 'text-emerald-500' : s.avgScore >= 50 ? 'text-amber-500' : 'text-rose-500'
                )}>
                  {s.avgScore}%
                </span>
              </motion.div>
            ))}
            {topStudents.length === 0 && (
              <div className="flex flex-col items-center py-6">
                <Trophy className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No data yet.</p>
              </div>
            )}
          </div>
        </motion.div>

        {analytics && analytics.resultsByDay.length > 0 && (
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <BookOpen className="h-4 w-4 text-indigo-500" /> Daily Activity (Last 30 Days)
            </h3>
            <div className="flex items-end gap-1 overflow-x-auto pb-2">
              {analytics.resultsByDay.map((day, i) => (
                <motion.div
                  key={i}
                  className="flex flex-col items-center gap-1"
                  style={{ minWidth: '24px' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.015, duration: 0.3 }}
                >
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{day.count}</span>
                  <motion.div
                    className="w-5 rounded bg-gradient-to-t from-indigo-500 to-indigo-400"
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(day.count * 8, 4)}px` }}
                    transition={{ duration: 0.5, delay: i * 0.015, ease: 'easeOut' }}
                  />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{day.date.slice(5)}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <Users className="h-4 w-4 text-indigo-500" /> All Students ({students.length})
          </h3>
          {students.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Users className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">No students yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-xs font-bold text-white">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{s.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{s.email}</p>
                  </div>
                  <div className="hidden items-center gap-4 sm:flex">
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{s.quizzesTaken}</p>
                      <p className="text-[10px] text-slate-500">Quizzes</p>
                    </div>
                    <div className="text-center">
                      <p className={cn(
                        'text-sm font-bold',
                        s.avgScore >= 75 ? 'text-emerald-500' : s.avgScore >= 50 ? 'text-amber-500' : 'text-rose-500'
                      )}>
                        {s.avgScore}%
                      </p>
                      <p className="text-[10px] text-slate-500">Avg Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{s.documentsUploaded}</p>
                      <p className="text-[10px] text-slate-500">Docs</p>
                    </div>
                  </div>
                  <Link to={`/admin/analytics?student=${s.id}`}>
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400"
                    >
                      Details
                    </motion.span>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function StudentReport({ detail, onBack }: { detail: StudentDetail; onBack: () => void }) {
  const { student, results, documents, stats } = detail;

  const quizTitle = (qId: string | { _id: string; title: string }) => {
    if (typeof qId === 'object' && qId !== null) return qId.title;
    return 'Quiz';
  };

  return (
    <div className="p-4 sm:p-6">
      <motion.div className="mb-6" variants={fadeUp} initial="hidden" animate="visible">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analytics
        </motion.button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Report</h1>
      </motion.div>

      <motion.div
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        variants={slideUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl font-bold text-white">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{student.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {student.email}</span>
              {student.institution && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {student.institution}</span>}
              {student.gradeLevel && <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {student.gradeLevel}</span>}
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {new Date(student.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="mb-6 grid grid-cols-3 gap-3"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <StatMini icon={BarChart3} value={stats.totalQuizzes} label="Quizzes Taken" color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" />
        <StatMini icon={TrendingUp} value={`${stats.averageScore}%`} label="Average Score" color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" />
        <StatMini icon={FileText} value={stats.totalDocuments} label="Documents" color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" />
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <BarChart3 className="h-4 w-4 text-indigo-500" /> Quiz Results
          </h3>
          {results.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <BarChart3 className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">No quiz results yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r, i) => (
                <motion.div
                  key={r._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    r.score >= 75 ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-amber-100 dark:bg-amber-500/10'
                  )}>
                    <span className={cn(
                      'text-sm font-bold',
                      r.score >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                    )}>
                      {r.score}%
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{quizTitle(r.quizId)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {r.correctCount}/{r.totalQuestions} correct · {new Date(r.completedAt).toLocaleDateString()}
                    </p>
                  </div>
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
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <FileText className="h-4 w-4 text-blue-500" /> Documents
          </h3>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <FileText className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500">No documents uploaded.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    doc.status === 'ready' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : doc.status === 'failed' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  )}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{doc.originalName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(doc.fileSize / 1024).toFixed(1)} KB · {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    doc.status === 'ready' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : doc.status === 'failed' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  )}>
                    {doc.status}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {results.length > 0 && (
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Performance Trend
            </h3>
            <div className="flex items-end gap-2 overflow-x-auto pb-2">
              {results.slice().reverse().map((r, i) => (
                <motion.div
                  key={r._id}
                  className="flex flex-col items-center gap-1"
                  style={{ minWidth: '40px' }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                >
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{r.score}%</span>
                  <motion.div
                    className={cn(
                      'w-8 rounded-lg',
                      r.score >= 75 ? 'bg-emerald-500' : r.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    )}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(r.score * 1.5, 8)}px` }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                  />
                  <span className="text-[9px] text-slate-400">{new Date(r.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, value, label, color, bg }: { icon: React.ComponentType<{ className?: string }>; value: string | number; label: string; color: string; bg: string }) {
  return (
    <motion.div
      variants={bounceIn}
      whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
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
  );
}

function StatMini({ icon: Icon, value, label, color, bg }: { icon: React.ComponentType<{ className?: string }>; value: string | number; label: string; color: string; bg: string }) {
  return (
    <motion.div
      variants={bounceIn}
      whileHover={{ y: -2 }}
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-lg', bg)}>
        <Icon className={cn('h-4 w-4', color)} />
      </div>
      <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}
