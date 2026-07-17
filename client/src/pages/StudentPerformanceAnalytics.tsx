import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  BarChart3, TrendingUp, TrendingDown, Target, Trophy, BookOpen,
  ArrowRight, Brain, Zap, Flame, Medal, Star, Award, AlertTriangle,
  CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Sparkles,
} from 'lucide-react';
import { getStudentAnalytics } from '../services/api';
import { cn } from '../utils';
import { useAuth } from '../context/AuthContext';
import { fadeUp, slideUp, stagger, bounceIn } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import { SUBJECT_META, CLASS_META, DIFFICULTY_META, type JHSCategory, type SubjectId } from '../data/questionBank';
import type { StudentStats } from '../types';

interface LocalAssessment {
  classLevel: JHSCategory;
  subject: string;
  difficulty: string;
  assessmentType: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctCount: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  timeSpent: number;
  timestamp: number;
  completedAt?: string;
  abandoned?: boolean;
}

const GRADE_COLORS: Record<string, string> = {
  'A+': '#10b981', A: '#10b981', 'B+': '#3b82f6', B: '#3b82f6',
  'C+': '#f97316', C: '#f97316', D: '#ef4444', F: '#ef4444',
};

const SUBJECT_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#ef4444'];

function getGradeLabel(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 75) return 'B+';
  if (pct >= 70) return 'B';
  if (pct >= 65) return 'C+';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-rose-500';
}

function getScoreBg(score: number): string {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getGradeBg(grade: string): string {
  const g = grade.replace('+', '');
  if (g === 'A') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (g === 'B') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
  if (g === 'C') return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
}

function getRank(score: number): { label: string; icon: string; color: string } {
  if (score >= 90) return { label: 'A+ Star', icon: '⭐', color: 'text-amber-500' };
  if (score >= 80) return { label: 'A Scholar', icon: '🎓', color: 'text-emerald-500' };
  if (score >= 70) return { label: 'B Achiever', icon: '🏅', color: 'text-blue-500' };
  if (score >= 60) return { label: 'C Learner', icon: '📚', color: 'text-violet-500' };
  return { label: 'D Keep Going', icon: '💪', color: 'text-rose-500' };
}

export default function StudentPerformanceAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudentAnalytics()
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const localAssessments = useMemo(() => {
    try {
      const raw = localStorage.getItem('assessment-history');
      return raw ? (JSON.parse(raw) as LocalAssessment[]) : [];
    } catch { return []; }
  }, []);

  const allResults = useMemo(() => {
    return localAssessments
      .filter(a => !a.abandoned)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [localAssessments]);

  const kpis = useMemo(() => {
    const totalAssessments = allResults.length;
    const avgScore = totalAssessments > 0
      ? Math.round(allResults.reduce((s, r) => s + r.percentage, 0) / totalAssessments) : 0;
    const totalCorrect = allResults.reduce((s, r) => s + r.correctCount, 0);
    const totalAnswered = allResults.reduce((s, r) => s + r.answeredQuestions, 0);
    const passRate = totalAssessments > 0
      ? Math.round((allResults.filter(r => r.passed).length / totalAssessments) * 100) : 0;
    const rank = getRank(avgScore);
    const uniqueSubjects = new Set(allResults.map(r => r.subject)).size;
    const avgTime = totalAssessments > 0
      ? Math.round(allResults.reduce((s, r) => s + r.timeSpent, 0) / totalAssessments) : 0;

    const recent5 = allResults.slice(0, 5);
    const older5 = allResults.slice(5, 10);
    const recentAvg = recent5.length > 0 ? Math.round(recent5.reduce((s, r) => s + r.percentage, 0) / recent5.length) : 0;
    const olderAvg = older5.length > 0 ? Math.round(older5.reduce((s, r) => s + r.percentage, 0) / older5.length) : 0;
    const trend = olderAvg > 0 ? recentAvg - olderAvg : 0;

    return { totalAssessments, avgScore, totalCorrect, totalAnswered, passRate, rank, uniqueSubjects, avgTime, trend };
  }, [allResults]);

  const subjectPerformance = useMemo(() => {
    const map = new Map<string, { total: number; correct: number; count: number }>();
    allResults.forEach(r => {
      const key = r.subject;
      const existing = map.get(key) || { total: 0, correct: 0, count: 0 };
      existing.total += r.answeredQuestions;
      existing.correct += r.correctCount;
      existing.count += 1;
      map.set(key, existing);
    });
    return Array.from(map.entries()).map(([subject, data]) => {
      const meta = SUBJECT_META[subject as SubjectId];
      return {
        subject: meta?.label || subject,
        icon: meta?.icon || '📝',
        score: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
        correct: data.correct,
        total: data.total,
        attempts: data.count,
        color: meta?.color || 'slate',
      };
    }).sort((a, b) => b.score - a.score);
  }, [allResults]);

  const radarData = useMemo(() => {
    return subjectPerformance.map(sp => ({
      subject: sp.icon + ' ' + sp.subject.split(' ')[0],
      score: sp.score,
      fullMark: 100,
    }));
  }, [subjectPerformance]);

  const scoreOverTime = useMemo(() => {
    const sorted = [...allResults].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.map((r, i) => ({
      index: i + 1,
      score: r.percentage,
      label: `${SUBJECT_META[r.subject as SubjectId]?.icon || ''} ${r.assessmentType}`,
      date: new Date(r.timestamp || r.completedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [allResults]);

  const gradeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    allResults.forEach(r => {
      const grade = getGradeLabel(r.percentage);
      map.set(grade, (map.get(grade) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, color: GRADE_COLORS[name] || '#6b7280' }))
      .sort((a, b) => {
        const order = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'];
        return order.indexOf(a.name) - order.indexOf(b.name);
      });
  }, [allResults]);

  const classPerformance = useMemo(() => {
    const map = new Map<string, { total: number; correct: number; count: number }>();
    allResults.forEach(r => {
      const key = r.classLevel;
      const existing = map.get(key) || { total: 0, correct: 0, count: 0 };
      existing.total += r.answeredQuestions;
      existing.correct += r.correctCount;
      existing.count += 1;
      map.set(key, existing);
    });
    return Array.from(map.entries()).map(([cls, data]) => ({
      class: CLASS_META[cls as JHSCategory]?.label || cls,
      score: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      attempts: data.count,
    }));
  }, [allResults]);

  const difficultyBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; correct: number; count: number }>();
    allResults.forEach(r => {
      const key = r.difficulty;
      const existing = map.get(key) || { total: 0, correct: 0, count: 0 };
      existing.total += r.answeredQuestions;
      existing.correct += r.correctCount;
      existing.count += 1;
      map.set(key, existing);
    });
    return Array.from(map.entries()).map(([diff, data]) => ({
      difficulty: DIFFICULTY_META[diff as keyof typeof DIFFICULTY_META]?.label || diff,
      score: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      attempts: data.count,
      color: DIFFICULTY_META[diff as keyof typeof DIFFICULTY_META]?.color || 'slate',
    }));
  }, [allResults]);

  const strengths = useMemo(() => subjectPerformance.filter(s => s.score >= 75), [subjectPerformance]);
  const weaknesses = useMemo(() => subjectPerformance.filter(s => s.score < 60 && s.attempts > 0), [subjectPerformance]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-sm font-bold text-slate-900 dark:text-white">
            {p.name}: {p.value}%
          </p>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <AnimatedSpinner label="Loading performance data..." />
      </div>
    );
  }

  if (allResults.length === 0 && (!analytics || analytics.totalQuizzes === 0)) {
    return (
      <motion.div
        className="p-12 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <BarChart3 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">No performance data yet</h2>
        <p className="mb-4 text-sm text-slate-500">Complete some assessments to see your performance analytics.</p>
        <Link
          to="/assessment/setup"
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Take an Assessment <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Performance Analytics</h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {user?.name?.split(' ')[0] || 'Your'}'s comprehensive performance overview
              </p>
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <KpiCard
            icon={Target}
            value={kpis.totalAssessments}
            label="Assessments"
            color="text-blue-500"
            bg="bg-blue-50 dark:bg-blue-500/10"
          />
          <KpiCard
            icon={TrendingUp}
            value={`${kpis.avgScore}%`}
            label="Avg Score"
            color="text-emerald-500"
            bg="bg-emerald-50 dark:bg-emerald-500/10"
            badge={kpis.trend !== 0 ? `${kpis.trend > 0 ? '+' : ''}${kpis.trend}%` : undefined}
            badgeColor={kpis.trend > 0 ? 'text-emerald-500' : kpis.trend < 0 ? 'text-rose-500' : undefined}
          />
          <KpiCard
            icon={CheckCircle2}
            value={`${kpis.passRate}%`}
            label="Pass Rate"
            color="text-blue-500"
            bg="bg-blue-50 dark:bg-blue-500/10"
          />
          <KpiCard
            icon={BookOpen}
            value={kpis.uniqueSubjects}
            label="Subjects"
            color="text-violet-500"
            bg="bg-violet-50 dark:bg-violet-500/10"
          />
          <KpiCard
            icon={Clock}
            value={`${kpis.avgTime}s`}
            label="Avg Time"
            color="text-amber-500"
            bg="bg-amber-50 dark:bg-amber-500/10"
          />
          <KpiCard
            icon={Medal}
            value={kpis.rank.label.split(' ')[0]}
            label="Rank"
            color={kpis.rank.color}
            bg="bg-slate-50 dark:bg-slate-500/10"
          />
        </motion.div>

        {/* Score Trend + Grade Distribution */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Score Trend Line */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <TrendingUp className="h-4 w-4 text-blue-500" /> Score Progression
            </h2>
            {scoreOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={scoreOverTime} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
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
              <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">No data points</div>
            )}
          </motion.div>

          {/* Grade Distribution */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Award className="h-4 w-4 text-amber-500" /> Grade Distribution
            </h2>
            {gradeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value} assessments`, name]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">No data</div>
            )}
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {gradeDistribution.map(g => (
                <span key={g.name} className="inline-flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="font-medium text-slate-600 dark:text-slate-400">{g.name}</span>
                  <span className="text-slate-400">({g.value})</span>
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Subject Performance Bar Chart + Radar */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Bar Chart */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-3 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <BarChart3 className="h-4 w-4 text-emerald-500" /> Subject Performance
            </h2>
            {subjectPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={subjectPerformance} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="score" name="Score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {subjectPerformance.map((entry, index) => (
                      <Cell key={index} fill={SUBJECT_COLORS[index % SUBJECT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">No subject data</div>
            )}
          </motion.div>

          {/* Radar Chart */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Sparkles className="h-4 w-4 text-violet-500" /> Skills Radar
            </h2>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                  <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-slate-400">No data</div>
            )}
          </motion.div>
        </div>

        {/* Strengths + Weaknesses + Class/Difficulty */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Strengths */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Star className="h-4 w-4 text-emerald-500" /> Strengths
            </h2>
            {strengths.length > 0 ? (
              <div className="space-y-3">
                {strengths.map((s, i) => (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <span>{s.icon}</span> {s.subject}
                      </span>
                      <span className="text-sm font-bold text-emerald-500">{s.score}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                        initial={{ width: '0%' }}
                        animate={{ width: `${s.score}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">Complete more assessments to reveal strengths</p>
            )}
          </motion.div>

          {/* Weaknesses */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Areas to Improve
            </h2>
            {weaknesses.length > 0 ? (
              <div className="space-y-3">
                {weaknesses.map((w, i) => (
                  <div key={i}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <span>{w.icon}</span> {w.subject}
                      </span>
                      <span className="text-sm font-bold text-rose-500">{w.score}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600"
                        initial={{ width: '0%' }}
                        animate={{ width: `${w.score}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6">
                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Great job! No weak areas detected.</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Class & Difficulty Breakdown */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* By Class */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <BookOpen className="h-4 w-4 text-blue-500" /> Performance by Class
            </h2>
            {classPerformance.length > 0 ? (
              <div className="space-y-3">
                {classPerformance.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                      <span className="text-lg font-bold text-blue-500">{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{c.class}</p>
                      <p className="text-xs text-slate-500">{c.attempts} assessment{c.attempts !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={cn('text-lg font-bold', getScoreColor(c.score))}>{c.score}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">No class data available</p>
            )}
          </motion.div>

          {/* By Difficulty */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Flame className="h-4 w-4 text-orange-500" /> Performance by Difficulty
            </h2>
            {difficultyBreakdown.length > 0 ? (
              <div className="space-y-4">
                {difficultyBreakdown.map((d, i) => {
                  const diffColor = d.color === 'emerald' ? 'from-emerald-400 to-emerald-600'
                    : d.color === 'amber' ? 'from-amber-400 to-amber-600'
                    : 'from-rose-400 to-rose-600';
                  return (
                    <div key={i}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{d.difficulty}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">{d.attempts} attempts</span>
                          <span className={cn('text-sm font-bold', getScoreColor(d.score))}>{d.score}%</span>
                        </div>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <motion.div
                          className={cn('h-full rounded-full bg-gradient-to-r', diffColor)}
                          initial={{ width: '0%' }}
                          animate={{ width: `${d.score}%` }}
                          transition={{ duration: 0.8, delay: i * 0.15, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">No difficulty data available</p>
            )}
          </motion.div>
        </div>

        {/* Recent Results Table */}
        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Clock className="h-4 w-4 text-indigo-500" /> Recent Results
            </h2>
            {allResults.length > 5 && (
              <Link to="/assessment/history" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                View All
              </Link>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Difficulty</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Score</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Grade</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {allResults.slice(0, 10).map((r, i) => {
                  const meta = SUBJECT_META[r.subject as SubjectId];
                  const grade = getGradeLabel(r.percentage);
                  return (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.25 }}
                    >
                      <td className="py-3 pr-4">
                        <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-white">
                          {meta?.icon} {meta?.label || r.subject}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {r.assessmentType}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={cn(
                          'rounded-lg px-2 py-1 text-xs font-medium',
                          r.difficulty === 'beginner' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : r.difficulty === 'intermediate' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                            : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        )}>
                          {r.difficulty}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className={cn('h-full rounded-full', getScoreBg(r.percentage))} style={{ width: `${r.percentage}%` }} />
                          </div>
                          <span className={cn('text-sm font-bold', getScoreColor(r.percentage))}>{r.percentage}%</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={cn('inline-block rounded-lg px-2.5 py-1 text-xs font-bold', getGradeBg(grade))}>
                          {grade}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(r.timestamp || r.completedAt || Date.now()).toLocaleDateString()}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="space-y-2 md:hidden">
            {allResults.slice(0, 10).map((r, i) => {
              const meta = SUBJECT_META[r.subject as SubjectId];
              const grade = getGradeLabel(r.percentage);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/50"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-white">
                      {meta?.icon} {meta?.label || r.subject}
                    </span>
                    <span className={cn('inline-block rounded-lg px-2 py-0.5 text-xs font-bold', getGradeBg(grade))}>
                      {grade}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{r.assessmentType} · {r.difficulty}</span>
                    <span>{new Date(r.timestamp || r.completedAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className={cn('h-full rounded-full', getScoreBg(r.percentage))} style={{ width: `${r.percentage}%` }} />
                    </div>
                    <span className={cn('text-sm font-bold', getScoreColor(r.percentage))}>{r.percentage}%</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <Link to="/assessment/setup" className="group block">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 p-6 shadow-xl transition-all hover:shadow-2xl hover:scale-[1.01]">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Keep Improving!</h2>
                  <p className="mt-1 text-sm text-blue-100">Take another assessment to boost your performance.</p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition group-hover:bg-white/25">
                    <Target className="h-4 w-4" />
                    Take Assessment
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
    </div>
  );
}

function KpiCard({
  icon: Icon,
  value,
  label,
  color,
  bg,
  badge,
  badgeColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  color: string;
  bg: string;
  badge?: string;
  badgeColor?: string;
}) {
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
      <div className="flex items-center gap-2">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        {badge && (
          <span className={cn('flex items-center gap-0.5 text-xs font-bold', badgeColor || 'text-slate-400')}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}
