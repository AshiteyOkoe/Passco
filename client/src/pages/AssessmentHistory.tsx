import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Clock, Trophy, BarChart3, CheckCircle2, XCircle,
  Filter, BookOpen, Target, AlertCircle, ClipboardList, ChevronDown,
} from 'lucide-react';
import { cn } from '../utils';
import { bounceIn, fadeUp, stagger } from '../utils/animations';
import { CLASS_META, SUBJECT_META, type JHSCategory, type SubjectId } from '../data/questionBank';

interface HistoryEntry {
  classLevel: string;
  subject?: string;
  difficulty: string;
  assessmentType: string;
  totalQuestions: number;
  answeredQuestions: number;
  percentage: number;
  grade: string;
  passed: boolean;
  timeSpent: number;
  completedAt: string;
  abandoned?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getGradeColor(grade: string): string {
  if (grade === 'A+' || grade === 'A') return 'text-emerald-500';
  if (grade === 'B') return 'text-indigo-500';
  if (grade === 'C') return 'text-amber-500';
  return 'text-rose-500';
}

function getGradeBg(grade: string): string {
  if (grade === 'A+' || grade === 'A') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (grade === 'B') return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400';
  if (grade === 'C') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
}

function getDifficultyColor(difficulty: string): string {
  if (difficulty === 'beginner') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  if (difficulty === 'intermediate') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  return 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
}

export default function AssessmentHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('assessment-history');
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryEntry[];
        setHistory(parsed.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()));
      }
    } catch {
      setHistory([]);
    }
  }, []);

  const filtered = useMemo(() => {
    return history.filter((e) => {
      if (filterClass !== 'all' && e.classLevel !== filterClass) return false;
      if (filterSubject !== 'all' && e.subject !== filterSubject) return false;
      if (filterDifficulty !== 'all' && e.difficulty !== filterDifficulty) return false;
      if (filterType !== 'all' && e.assessmentType !== filterType) return false;
      return true;
    });
  }, [history, filterClass, filterSubject, filterDifficulty, filterType]);

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const total = history.length;
    const avgScore = Math.round(history.reduce((s, e) => s + e.percentage, 0) / total);
    const passRate = Math.round((history.filter((e) => e.passed).length / total) * 100);
    const grades = history.map((e) => e.grade);
    const bestGrade = grades.includes('A+') ? 'A+' : grades.includes('A') ? 'A' : grades.includes('B') ? 'B' : grades.includes('C') ? 'C' : grades.includes('D') ? 'D' : 'F';
    return { total, avgScore, passRate, bestGrade };
  }, [history]);

  const classOptions = useMemo(() => Object.keys(CLASS_META) as JHSCategory[], []);
  const subjectOptions = useMemo(() => Object.keys(SUBJECT_META) as SubjectId[], []);

  return (
    <div className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
                'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Results History</h1>
            <div className="w-[88px]" />
          </motion.div>

          {stats && (
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <motion.div
                variants={bounceIn}
                custom={0}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
              >
                <ClipboardList className="mx-auto mb-2 h-6 w-6 text-indigo-500" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Assessments Taken</p>
              </motion.div>
              <motion.div
                variants={bounceIn}
                custom={1}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
              >
                <BarChart3 className="mx-auto mb-2 h-6 w-6 text-blue-500" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.avgScore}%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Average Score</p>
              </motion.div>
              <motion.div
                variants={bounceIn}
                custom={2}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
              >
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.passRate}%</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pass Rate</p>
              </motion.div>
              <motion.div
                variants={bounceIn}
                custom={3}
                whileHover={{ y: -4 }}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
              >
                <Trophy className="mx-auto mb-2 h-6 w-6 text-amber-500" />
                <p className={cn('text-2xl font-bold', getGradeColor(stats.bestGrade))}>{stats.bestGrade}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Best Grade</p>
              </motion.div>
            </motion.div>
          )}

          {history.length > 0 && (
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <div className="relative">
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className={cn(
                    'appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-700 transition',
                    'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  <option value="all">All Classes</option>
                  {classOptions.map((c) => (
                    <option key={c} value={c}>{CLASS_META[c].label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="relative">
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className={cn(
                    'appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-700 transition',
                    'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  <option value="all">All Subjects</option>
                  {subjectOptions.map((s) => (
                    <option key={s} value={s}>{SUBJECT_META[s].label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="relative">
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className={cn(
                    'appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-700 transition',
                    'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={cn(
                    'appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-700 transition',
                    'dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  <option value="all">All Types</option>
                  <option value="quiz">Quiz</option>
                  <option value="mock">Mock Test</option>
                  <option value="examination">Examination</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            </motion.div>
          )}

          {history.length === 0 ? (
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900"
            >
              <ClipboardList className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">No assessments taken yet</h2>
              <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                Complete your first assessment to see your results here.
              </p>
              <button
                onClick={() => navigate('/assessment/setup')}
                className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Target className="h-4 w-4" />
                Start an Assessment
              </button>
            </motion.div>
          ) : filtered.length === 0 ? (
            <motion.div
              variants={fadeUp}
              className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900"
            >
              <Filter className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">No matching results</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Try adjusting your filters to find what you're looking for.
              </p>
            </motion.div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
              {filtered.map((entry, i) => {
                const classLabel = CLASS_META[entry.classLevel as JHSCategory]?.label ?? entry.classLevel;
                const subjectLabel = entry.subject ? SUBJECT_META[entry.subject as SubjectId]?.label ?? entry.subject : 'All Subjects';
                const date = new Date(entry.completedAt);
                const formattedDate = date.toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });
                const formattedTime = date.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <motion.div
                    key={`${entry.completedAt}-${i}`}
                    variants={fadeUp}
                    custom={i}
                    whileHover={{ y: -2 }}
                    className={cn(
                      'rounded-2xl border bg-white p-4 transition dark:bg-slate-900',
                      entry.abandoned
                        ? 'border-amber-200 dark:border-amber-800/30'
                        : entry.passed
                          ? 'border-emerald-200 dark:border-emerald-800/30'
                          : 'border-rose-200 dark:border-rose-800/30'
                    )}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {classLabel}
                          </span>
                          {entry.subject && (
                            <>
                              <span className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                                <BookOpen className="h-3 w-3" />
                                {subjectLabel}
                              </span>
                            </>
                          )}
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-sm capitalize text-slate-600 dark:text-slate-400">
                            {entry.assessmentType === 'mock' ? 'Mock Test' : entry.assessmentType === 'examination' ? 'Examination' : 'Quiz'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium', getDifficultyColor(entry.difficulty))}>
                            {entry.difficulty.charAt(0).toUpperCase() + entry.difficulty.slice(1)}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Target className="h-3 w-3" />
                            {entry.answeredQuestions}/{entry.totalQuestions} questions
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Clock className="h-3 w-3" />
                            {formatTime(entry.timeSpent)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={cn('text-2xl font-bold', getGradeColor(entry.grade))}>
                            {entry.grade}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {entry.percentage}%
                          </p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold',
                            entry.abandoned
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                              : entry.passed
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                          )}
                        >
                          {entry.abandoned ? (
                            <AlertCircle className="h-3 w-3" />
                          ) : entry.passed ? (
                            <Trophy className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {entry.abandoned ? 'Abandoned' : entry.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <Clock className="h-3 w-3" />
                      {formattedDate} at {formattedTime}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
