import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStudentAnalytics } from '../services/api';
import {
  Brain, Target, BookOpen, TrendingUp, Trophy,
  Sparkles, ArrowRight, History, BarChart3,
  ClipboardCheck, GraduationCap,
  Lock, Award, Star, Zap, Flame, Medal, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { StudentStats } from '../types';
import { CLASS_META, SUBJECT_META, type JHSCategory, type SubjectId } from '../data/questionBank';

interface AssessmentResult {
  classLevel: JHSCategory;
  subject: SubjectId;
  difficulty: string;
  assessmentType: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
  grade: string;
  passed: boolean;
  timeUsed: number;
  timestamp: number;
  completedAt?: string;
  abandoned?: boolean;
  studentName?: string;
}

function getAssessmentHistory(): AssessmentResult[] {
  try {
    const raw = localStorage.getItem('assessment-history');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function isBirthdayToday(dateOfBirth?: string | null): boolean {
  if (!dateOfBirth) return false;
  const today = new Date();
  const dob = new Date(dateOfBirth);
  return dob.getUTCMonth() === today.getMonth() && dob.getUTCDate() === today.getDate();
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudentAnalytics()
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const history = useMemo(() => getAssessmentHistory(), []);

  const recentAssessments = useMemo(() => {
    return [...history]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  }, [history]);

  const stats = useMemo(() => {
    const completed = history.length;
    const avgScore = completed > 0
      ? Math.round(history.reduce((sum, r) => sum + r.percentage, 0) / completed)
      : 0;
    const uniqueSubjects = new Set(history.map((r) => r.subject)).size;

    let rank = 'D Keep Going';
    if (avgScore >= 90) rank = 'A+ Star';
    else if (avgScore >= 80) rank = 'A Scholar';
    else if (avgScore >= 70) rank = 'B Achiever';
    else if (avgScore >= 60) rank = 'C Learner';

    const perfectScore = history.some((r) => r.percentage === 100);
    const highScore90 = history.some((r) => r.percentage >= 90);

    const badges = {
      firstStep: completed >= 1,
      subjectExplorer: uniqueSubjects >= 3,
      highAchiever: avgScore >= 80,
      perfectScore,
      persistentLearner: completed >= 5,
      classChampion: highScore90,
    };

    return { completed, avgScore, uniqueSubjects, rank, badges };
  }, [history]);

  const scoreOverTime = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.map((r, i) => ({
      index: i + 1,
      score: r.percentage,
      label: SUBJECT_META[r.subject]?.icon || '',
      date: new Date(r.timestamp || r.completedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [history]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center sm:text-left"
        >
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
            Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Track your progress, take assessments, and achieve your goals.
          </p>
        </motion.div>

        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Score Progression</h2>
            </div>
            {scoreOverTime.length > 0 && (
              <Link to="/analytics/performance" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                Full Chart <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          {scoreOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={scoreOverTime} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                  formatter={(value: number) => [`${value}%`, 'Score']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#3b82f6' }}
                  name="Score"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center text-center">
              <BarChart3 className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-400 dark:text-slate-500">No assessment data yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Take an assessment to see your score trend</p>
            </div>
          )}
        </motion.div>

        {/* Birthday Wish Banner */}
        {isBirthdayToday(user?.dateOfBirth) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-5 dark:border-amber-800 dark:from-amber-950/40 dark:via-yellow-950/40 dark:to-orange-950/40"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-lg shadow-amber-500/25">
                🎂
              </div>
              <div>
                <h2 className="text-lg font-bold text-amber-800 dark:text-amber-200">
                  Happy Birthday, {user?.name?.split(' ')[0] || 'Student'}! 🎉
                </h2>
                <p className="text-sm text-amber-700/80 dark:text-amber-300/80">
                  From all of us at Passco, we wish you a wonderful day filled with joy and learning. Keep shining!
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-4 -top-4 text-6xl opacity-10">🎈</div>
            <div className="pointer-events-none absolute -bottom-2 -left-2 text-4xl opacity-10">🎁</div>
          </motion.div>
        )}

        {/* Quick Stats Row */}
        <motion.div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} custom={0}>
            <Link to="/analytics">
              <MetricCard
                icon={ClipboardCheck}
                value={analytics?.totalQuizzes || 0}
                label="Quizzes Taken"
                color="text-indigo-500"
                bg="bg-indigo-50 dark:bg-indigo-500/10"
              />
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} custom={1}>
            <Link to="/analytics">
              <MetricCard
                icon={TrendingUp}
                value={`${stats.avgScore}%`}
                label="Avg Assessment"
                color="text-emerald-500"
                bg="bg-emerald-50 dark:bg-emerald-500/10"
              />
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} custom={2}>
            <Link to="/analytics">
              <MetricCard
                icon={Trophy}
                value={stats.rank.split(' ')[0]}
                label="Current Rank"
                color="text-amber-500"
                bg="bg-amber-50 dark:bg-amber-500/10"
              />
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} custom={3}>
            <Link to="/assessment/history">
              <MetricCard
                icon={History}
                value={stats.completed}
                label="Assessments Done"
                color="text-rose-500"
                bg="bg-rose-50 dark:bg-rose-500/10"
              />
            </Link>
          </motion.div>
        </motion.div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link to="/assessment/setup" className="group block">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 shadow-xl shadow-emerald-500/20 transition-all hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-[1.02]">
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-emerald-200" />
                      <span className="text-xs font-semibold text-emerald-100">JHS Assessment</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">Take an Assessment</h2>
                    <p className="mt-1 text-sm text-emerald-100">Quiz, Mock Test, or Examination</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition group-hover:bg-white/25">
                      <ClipboardCheck className="h-4 w-4" />
                      Start Now
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                  <div className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm sm:flex">
                    <ClipboardCheck className="h-8 w-8 text-white/80" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link to="/analytics" className="group block">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 p-6 shadow-xl shadow-indigo-500/20 transition-all hover:shadow-2xl hover:shadow-indigo-500/30 hover:scale-[1.02]">
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-indigo-200" />
                      <span className="text-xs font-semibold text-indigo-100">Performance</span>
                    </div>
                    <h2 className="text-xl font-bold text-white">View Analytics</h2>
                    <p className="mt-1 text-sm text-indigo-100">Track scores and weak areas</p>
                    <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition group-hover:bg-white/25">
                      <TrendingUp className="h-4 w-4" />
                      View Now
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                  <div className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm sm:flex">
                    <BarChart3 className="h-8 w-8 text-white/80" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Your Progress</h2>
          <motion.div
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeUp} custom={0}>
              <Link to="/assessment/history" className="block transition hover:shadow-md hover:-translate-y-0.5 rounded-2xl">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                    <Target className="h-6 w-6 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.completed}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Assessments Completed</p>
                </div>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} custom={1}>
              <Link to="/analytics" className="block transition hover:shadow-md hover:-translate-y-0.5 rounded-2xl">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                    <TrendingUp className="h-6 w-6 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.avgScore}%</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Average Score</p>
                </div>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} custom={2}>
              <Link to="/analytics" className="block transition hover:shadow-md hover:-translate-y-0.5 rounded-2xl">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10">
                    <BookOpen className="h-6 w-6 text-violet-500" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.uniqueSubjects}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Subjects Studied</p>
                </div>
              </Link>
            </motion.div>
            <motion.div variants={fadeUp} custom={3}>
              <Link to="/analytics" className="block transition hover:shadow-md hover:-translate-y-0.5 rounded-2xl">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center dark:border-slate-800 dark:bg-slate-900">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
                    <Medal className="h-6 w-6 text-amber-500" />
                  </div>
                  <p className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{stats.rank}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Current Rank</p>
                </div>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Recent Assessments */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Assessments</h2>
            </div>
            {recentAssessments.length > 0 && (
              <Link to="/assessment/history" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                View All
              </Link>
            )}
          </div>
          {recentAssessments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"
            >
              <Brain className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                No assessments yet — start your learning journey!
              </p>
              <Link
                to="/assessment/setup"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <ClipboardCheck className="h-4 w-4" />
                Take Your First Assessment
              </Link>
            </motion.div>
          ) : (
            <motion.div
              className="space-y-2"
              variants={stagger}
              initial="hidden"
              animate="visible"
            >
              {recentAssessments.map((r, i) => {
                const classLabel = CLASS_META[r.classLevel]?.label || r.classLevel;
                const subjectMeta = SUBJECT_META[r.subject as SubjectId];
                return (
                  <motion.div
                    key={`${r.timestamp || r.completedAt || i}-${i}`}
                    variants={fadeUp}
                    custom={i}
                    className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        r.abandoned
                          ? 'bg-amber-100 dark:bg-amber-500/10'
                          : r.passed
                            ? 'bg-emerald-100 dark:bg-emerald-500/10'
                            : 'bg-red-100 dark:bg-red-500/10'
                      }`}>
                        {r.abandoned ? (
                          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        ) : r.passed ? (
                          <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Brain className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          {classLabel} — {subjectMeta?.icon} {subjectMeta?.label || r.subject}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{r.difficulty}</span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{r.assessmentType}</span>
                          {r.abandoned ? (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">Abandoned</span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{r.correctAnswers} correct</span>
                              {r.wrongAnswers > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-red-700 dark:bg-red-500/10 dark:text-red-400">{r.wrongAnswers} wrong</span>
                              )}
                              <span>{r.answeredQuestions}/{r.totalQuestions} answered</span>
                            </>
                          )}
                        </div>
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                          <span>{r.timeUsed ? `${Math.floor(r.timeUsed / 60)}m ${r.timeUsed % 60}s` : '—'}</span>
                          <span>•</span>
                          <span>{r.completedAt ? new Date(r.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xl font-bold ${r.percentage >= 75 ? 'text-emerald-600 dark:text-emerald-400' : r.percentage >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                          {r.percentage}%
                        </p>
                        <p className={`mt-0.5 inline-block rounded-md px-2 py-0.5 text-xs font-bold ${
                          r.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                        }`}>
                          {r.grade}
                        </p>
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {r.passed ? 'Passed' : 'Failed'}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Achievement Badges */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Achievement Badges</h2>
            </div>
            <Link
              to="/achievements"
              className="flex items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Earned Summary */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-md shadow-amber-200 dark:shadow-amber-900/30">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                {stats.badges.firstStep || stats.badges.subjectExplorer || stats.badges.highAchiever || stats.badges.perfectScore || stats.badges.persistentLearner || stats.badges.classChampion
                  ? `${Object.values(stats.badges).filter(Boolean).length} of 6 badges earned`
                  : 'No badges earned yet'}
              </p>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${(Object.values(stats.badges).filter(Boolean).length / 6) * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
            <Link to="/achievements" className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
              Explore
            </Link>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {[
              {
                key: 'firstStep',
                label: 'First Step',
                desc: 'Complete 1 assessment',
                icon: Star,
                earned: stats.badges.firstStep,
                color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10',
                ring: 'ring-blue-500/30',
              },
              {
                key: 'subjectExplorer',
                label: 'Subject Explorer',
                desc: 'Study 3+ subjects',
                icon: Sparkles,
                earned: stats.badges.subjectExplorer,
                color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10',
                ring: 'ring-violet-500/30',
              },
              {
                key: 'highAchiever',
                label: 'High Achiever',
                desc: '80%+ average',
                icon: TrendingUp,
                earned: stats.badges.highAchiever,
                color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10',
                ring: 'ring-emerald-500/30',
              },
              {
                key: 'perfectScore',
                label: 'Perfect Score',
                desc: 'Score 100% on any test',
                icon: Zap,
                earned: stats.badges.perfectScore,
                color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
                ring: 'ring-amber-500/30',
              },
              {
                key: 'persistentLearner',
                label: 'Persistent Learner',
                desc: 'Complete 5+ assessments',
                icon: Flame,
                earned: stats.badges.persistentLearner,
                color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10',
                ring: 'ring-orange-500/30',
              },
              {
                key: 'classChampion',
                label: 'Class Champion',
                desc: 'Score 90%+ in any test',
                icon: Medal,
                earned: stats.badges.classChampion,
                color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10',
                ring: 'ring-rose-500/30',
              },
            ].map((badge, i) => (
              <motion.div
                key={badge.key}
                variants={fadeUp}
                custom={i}
                className={`flex flex-col items-center rounded-2xl border p-5 text-center transition ${
                  badge.earned
                    ? `ring-2 ${badge.ring} bg-white dark:bg-slate-900`
                    : 'border-slate-200 bg-white/60 opacity-50 dark:border-slate-800 dark:bg-slate-900/60'
                }`}
              >
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
                  badge.earned ? badge.color : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                }`}>
                  {badge.earned ? (
                    <badge.icon className="h-6 w-6" />
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                </div>
                <p className={`text-sm font-bold ${badge.earned ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>
                  {badge.label}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{badge.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, value, label, color, bg }: { icon: React.ComponentType<{ className?: string }>; value: string | number; label: string; color: string; bg: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}
