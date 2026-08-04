import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, Cell, ComposedChart,
} from 'recharts';
import {
  BarChart3, TrendingUp, Target, BookOpen, ArrowRight, Flame,
  Calendar, Clock, Brain, Zap, Trophy, Star, AlertTriangle,
  CheckCircle2, Activity, ArrowLeft,
} from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../context/AuthContext';
import { fadeUp, slideUp, stagger, bounceIn } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import { SUBJECT_META, type ClassLevel, type SubjectId } from '../data/questionBank';

interface LocalAssessment {
  classLevel: ClassLevel;
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

function getGradeBg(grade: string): string {
  const g = grade.replace('+', '');
  if (g === 'A') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (g === 'B') return 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
  if (g === 'C') return 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
}

function getHeatmapColor(score: number | null): string {
  if (score === null) return 'bg-slate-100 dark:bg-slate-800/50';
  if (score >= 80) return 'bg-emerald-400 dark:bg-emerald-500';
  if (score >= 60) return 'bg-amber-400 dark:bg-amber-500';
  if (score >= 40) return 'bg-orange-400 dark:bg-orange-500';
  return 'bg-rose-400 dark:bg-rose-500';
}

function getHeatmapTextColor(score: number | null): string {
  if (score === null) return 'text-slate-400 dark:text-slate-600';
  if (score >= 80) return 'text-white';
  if (score >= 60) return 'text-white';
  return 'text-white';
}

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ResultsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const localAssessments = useMemo(() => {
    try {
      const raw = localStorage.getItem('assessment-history');
      return raw ? (JSON.parse(raw) as LocalAssessment[]) : [];
    } catch { return []; }
  }, []);

  const allResults = useMemo(() => {
    return localAssessments
      .filter(a => !a.abandoned)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [localAssessments]);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const scores = useMemo(() => allResults.map(r => r.percentage), [allResults]);

  const avgScore = useMemo(() => {
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  }, [scores]);

  const totalAssessments = allResults.length;
  const passRate = useMemo(() => {
    if (totalAssessments === 0) return 0;
    return Math.round((allResults.filter(r => r.passed).length / totalAssessments) * 100);
  }, [allResults, totalAssessments]);

  const trend = useMemo(() => {
    const recent5 = allResults.slice(-5);
    const older5 = allResults.slice(-10, -5);
    const recentAvg = recent5.length > 0 ? Math.round(recent5.reduce((s, r) => s + r.percentage, 0) / recent5.length) : 0;
    const olderAvg = older5.length > 0 ? Math.round(older5.reduce((s, r) => s + r.percentage, 0) / older5.length) : 0;
    return olderAvg > 0 ? recentAvg - olderAvg : 0;
  }, [allResults]);

  const heatmapData = useMemo(() => {
    const now = new Date();
    const dayMs = 86400000;
    const dayMap = new Map<string, number[]>();

    allResults.forEach(r => {
      const d = new Date(r.timestamp || r.completedAt || Date.now());
      const key = toKey(d);
      if (!dayMap.has(key)) dayMap.set(key, []);
      dayMap.get(key)!.push(r.percentage);
    });

    const days: Array<{ date: string; day: number; score: number | null; label: string }> = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(now.getTime() - i * dayMs);
      const key = toKey(d);
      const scoresForDay = dayMap.get(key) || null;
      const avg = scoresForDay ? Math.round(scoresForDay.reduce((s, v) => s + v, 0) / scoresForDay.length) : null;
      days.push({
        date: key,
        day: d.getDay(),
        score: avg,
        label: `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${avg !== null ? ` - ${avg}%` : ''}`,
      });
    }
    return days;
  }, [allResults]);

  const consistencyScore = useMemo(() => {
    if (scores.length < 2) return { score: 100, label: 'Very Consistent', color: 'text-emerald-500', ringColor: '#10b981' };
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    const variance = scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, Math.min(100, Math.round(100 - stdDev * 2)));
    let label = 'Inconsistent';
    let color = 'text-rose-500';
    let ringColor = '#ef4444';
    if (consistency >= 80) { label = 'Very Consistent'; color = 'text-emerald-500'; ringColor = '#10b981'; }
    else if (consistency >= 60) { label = 'Consistent'; color = 'text-blue-500'; ringColor = '#3b82f6'; }
    else if (consistency >= 40) { label = 'Variable'; color = 'text-amber-500'; ringColor = '#f59e0b'; }
    return { score: consistency, label, color, ringColor };
  }, [scores]);

  const predictedGrade = useMemo(() => {
    if (scores.length === 0) return { grade: 'N/A', confidence: 0 };
    let weightedSum = 0;
    let weightTotal = 0;
    for (let i = 0; i < scores.length; i++) {
      const weight = Math.pow(1.5, i);
      weightedSum += scores[i] * weight;
      weightTotal += weight;
    }
    const predicted = Math.round(weightedSum / weightTotal);
    const confidence = Math.min(99, Math.round(30 + Math.min(scores.length * 5, 69)));
    return { grade: getGradeLabel(predicted), confidence };
  }, [scores]);

  const streakData = useMemo(() => {
    const daySet = new Set<string>();
    allResults.forEach(r => {
      const d = new Date(r.timestamp || r.completedAt || Date.now());
      daySet.add(toKey(d));
    });

    const uniqueDays = daySet.size;
    const today = new Date();
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < 365; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      const key = toKey(d);
      if (daySet.has(key)) {
        tempStreak++;
        if (i === currentStreak) currentStreak = tempStreak;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        if (i === currentStreak) currentStreak = 0;
        tempStreak = 0;
      }
    }

    return { currentStreak, bestStreak, uniqueDays };
  }, [allResults]);

  const subjectMastery = useMemo(() => {
    const map = new Map<string, LocalAssessment[]>();
    allResults.forEach(r => {
      if (!map.has(r.subject)) map.set(r.subject, []);
      map.get(r.subject)!.push(r);
    });

    return Array.from(map.entries()).map(([subject, assessments]) => {
      const sorted = [...assessments].sort((a, b) => a.timestamp - b.timestamp);
      const avgScore = Math.round(sorted.reduce((s, r) => s + r.percentage, 0) / sorted.length);
      const latestScore = sorted[sorted.length - 1].percentage;
      const firstScore = sorted[0].percentage;
      const trendDir = latestScore > firstScore ? 'up' : latestScore < firstScore ? 'down' : 'flat';
      let masteryStatus = 'beginning';
      if (avgScore >= 80) masteryStatus = 'mastered';
      else if (avgScore >= 60) masteryStatus = 'developing';

      const meta = SUBJECT_META[subject as SubjectId];
      const timeline = sorted.map((r, i) => ({
        index: i + 1,
        score: r.percentage,
        date: new Date(r.timestamp || r.completedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));

      return {
        subject,
        label: meta?.label || subject,
        icon: meta?.icon || '📝',
        color: meta?.color || 'slate',
        avgScore,
        latestScore,
        trendDir,
        masteryStatus,
        attempts: sorted.length,
        timeline,
      };
    }).sort((a, b) => b.avgScore - a.avgScore);
  }, [allResults]);

  const scoreDistribution = useMemo(() => {
    const ranges = [
      { label: '0-20%', min: 0, max: 20, color: '#ef4444' },
      { label: '21-40%', min: 21, max: 40, color: '#f97316' },
      { label: '41-60%', min: 41, max: 60, color: '#f59e0b' },
      { label: '61-80%', min: 61, max: 80, color: '#3b82f6' },
      { label: '81-100%', min: 81, max: 100, color: '#10b981' },
    ];
    return ranges.map(r => ({
      range: r.label,
      count: scores.filter(s => s >= r.min && s <= r.max).length,
      color: r.color,
    }));
  }, [scores]);

  const gradeProgression = useMemo(() => {
    const sorted = [...allResults].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.map((r, i) => {
      const windowStart = Math.max(0, i - 4);
      const window = sorted.slice(windowStart, i + 1);
      const movingAvg = Math.round(window.reduce((s, v) => s + v.percentage, 0) / window.length);
      return {
        index: i + 1,
        score: r.percentage,
        movingAvg,
        date: new Date(r.timestamp || r.completedAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        label: `${SUBJECT_META[r.subject as SubjectId]?.icon || ''} ${r.assessmentType}`,
        grade: getGradeLabel(r.percentage),
      };
    });
  }, [allResults]);

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
        <AnimatedSpinner label="Loading results dashboard..." />
      </div>
    );
  }

  if (allResults.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl">
          <motion.div
            className="p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">No results yet</h2>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Complete some assessments to see your results dashboard.</p>
            <Link
              to="/assessment/setup"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Take an Assessment <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                to="/performance"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Results Dashboard</h1>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {user?.name?.split(' ')[0] || 'Your'}'s comprehensive exam results overview
                </p>
              </div>
            </div>
            <Link
              to="/performance"
              className="hidden items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:inline-flex"
            >
              <Activity className="h-4 w-4" />
              Analytics
            </Link>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={bounceIn} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <Target className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalAssessments}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total Assessments</p>
          </motion.div>
          <motion.div variants={bounceIn} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{avgScore}%</p>
              {trend !== 0 && (
                <span className={cn('text-xs font-bold', trend > 0 ? 'text-emerald-500' : 'text-rose-500')}>
                  {trend > 0 ? '+' : ''}{trend}%
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Average Score</p>
          </motion.div>
          <motion.div variants={bounceIn} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10">
              <CheckCircle2 className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{passRate}%</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pass Rate</p>
          </motion.div>
          <motion.div variants={bounceIn} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10">
              <BookOpen className="h-5 w-5 text-violet-500" />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{new Set(allResults.map(r => r.subject)).size}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Subjects Covered</p>
          </motion.div>
        </motion.div>

        {/* Score Heatmap */}
        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <Calendar className="h-4 w-4 text-indigo-500" /> Score Heatmap — Last 90 Days
          </h2>
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-rose-400" /> 0-39%</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-orange-400" /> 40-59%</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-amber-400" /> 60-79%</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-emerald-400" /> 80-100%</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" /> No data</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">{d}</div>
            ))}
            {(() => {
              const firstDay = heatmapData[0]?.day ?? 0;
              const emptySlots = Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} />
              ));
              return emptySlots.concat(
                heatmapData.map((d, i) => (
                  <motion.div
                    key={d.date}
                    className={cn(
                      'group relative flex h-10 w-full cursor-default items-center justify-center rounded-lg text-[10px] font-bold transition-transform hover:scale-110',
                      getHeatmapColor(d.score),
                      getHeatmapTextColor(d.score)
                    )}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.005, duration: 0.2 }}
                  >
                    {d.score !== null ? d.score : ''}
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs text-white shadow-lg group-hover:block dark:bg-slate-700">
                      {d.label}
                    </div>
                  </motion.div>
                ))
              );
            })()}
          </div>
        </motion.div>

        {/* Consistency + Predicted Grade + Streaks Row */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Consistency Score */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Activity className="h-4 w-4 text-blue-500" /> Consistency Score
            </h2>
            <div className="flex flex-col items-center">
              <div className="relative h-36 w-36">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                    className="dark:stroke-slate-700"
                  />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={consistencyScore.ringColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={326.73}
                    initial={{ strokeDashoffset: 326.73 }}
                    animate={{ strokeDashoffset: 326.73 - (326.73 * consistencyScore.score) / 100 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{consistencyScore.score}%</span>
                  <span className={cn('text-xs font-semibold', consistencyScore.color)}>{consistencyScore.label}</span>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Based on standard deviation of {scores.length} score{scores.length !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>

          {/* Predicted Grade */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Brain className="h-4 w-4 text-violet-500" /> Predicted Grade
            </h2>
            <div className="flex flex-col items-center">
              <motion.div
                className="flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-indigo-500/20"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              >
                <span className="text-4xl font-black text-white">{predictedGrade.grade}</span>
              </motion.div>
              <div className="mt-4 flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {predictedGrade.confidence}% confidence
                </span>
              </div>
              <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
                Weighted moving average with exponential weighting (factor 1.5)
              </p>
            </div>
          </motion.div>

          {/* Streak Tracking */}
          <motion.div
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <h2 className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Flame className="h-4 w-4 text-orange-500" /> Streak Tracking
            </h2>
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 shadow-lg shadow-orange-500/20">
                  <Flame className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{streakData.currentStreak}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Current streak (days)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{streakData.bestStreak}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Best streak</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{streakData.uniqueDays}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Days practiced</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Grade Progression Chart */}
        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <TrendingUp className="h-4 w-4 text-blue-500" /> Grade Progression
          </h2>
          {gradeProgression.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={gradeProgression} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name="Score" fill="url(#barGrad)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Line
                  type="monotone"
                  dataKey="movingAvg"
                  name="Moving Avg"
                  stroke="#f97316"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, fill: '#f97316' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">No data points</div>
          )}
          <div className="mt-2 flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500" /> Individual Score</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded bg-orange-500" /> Moving Average (last 5)</span>
          </div>
        </motion.div>

        {/* Score Distribution */}
        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <BarChart3 className="h-4 w-4 text-emerald-500" /> Score Distribution
          </h2>
          {scoreDistribution.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreDistribution} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  formatter={(value: number) => [`${value} assessment${value !== 1 ? 's' : ''}`, 'Count']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                  {scoreDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">No data</div>
          )}
        </motion.div>

        {/* Subject Mastery Timeline */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <BookOpen className="h-4 w-4 text-indigo-500" /> Subject Mastery Timeline
          </h2>
          {subjectMastery.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjectMastery.map((sub, i) => (
                <motion.div
                  key={sub.subject}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sub.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{sub.label}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{sub.attempts} attempt{sub.attempts !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {sub.trendDir === 'up' && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                      {sub.trendDir === 'down' && <TrendingUp className="h-4 w-4 rotate-180 text-rose-500" />}
                      {sub.trendDir === 'flat' && <Activity className="h-4 w-4 text-slate-400" />}
                    </div>
                  </div>

                  <div className="mb-3 flex items-center gap-3">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Avg</p>
                      <p className={cn('text-lg font-bold', getScoreColor(sub.avgScore))}>{sub.avgScore}%</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Latest</p>
                      <p className={cn('text-lg font-bold', getScoreColor(sub.latestScore))}>{sub.latestScore}%</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Status</p>
                      <span className={cn(
                        'inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold',
                        sub.masteryStatus === 'mastered' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        sub.masteryStatus === 'developing' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                      )}>
                        {sub.masteryStatus.charAt(0).toUpperCase() + sub.masteryStatus.slice(1)}
                      </span>
                    </div>
                  </div>

                  {sub.timeline.length >= 2 && (
                    <div className="h-16 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sub.timeline} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                          <defs>
                            <linearGradient id={`subjGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                            strokeWidth={2}
                            fill={`url(#subjGrad-${i})`}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {sub.timeline.length < 2 && (
                    <div className="flex h-16 items-center justify-center text-[10px] text-slate-400">
                      Need 2+ attempts for timeline
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No subject data available</p>
            </div>
          )}
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
                  <p className="mt-1 text-sm text-blue-100">Take another assessment to boost your results.</p>
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
