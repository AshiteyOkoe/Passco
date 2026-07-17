import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getStudentAnalytics } from '../services/api';
import { BarChart3, TrendingUp, Target, Trophy, BookOpen, Zap, ArrowRight } from 'lucide-react';
import { cn } from '../utils';
import { Link } from 'react-router-dom';
import { bounceIn, fadeUp, slideUp, stagger } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import type { StudentStats } from '../types';

export default function StudentAnalytics() {
  const [analytics, setAnalytics] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudentAnalytics()
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center p-12"><AnimatedSpinner label="Loading analytics..." /></div>;
  if (!analytics || analytics.totalQuizzes === 0) {
    return (
      <motion.div
        className="p-12 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <BarChart3 className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">No data yet</h2>
        <p className="mb-4 text-sm text-slate-500">Complete some quizzes to see your analytics.</p>
        <Link to="/assessment/setup" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">
          Take an Assessment <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="p-6">
      <motion.div className="mb-6 flex items-center justify-between" variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Analytics</h1>
        </div>
        <Link
          to="/analytics/performance"
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Full Performance
          <ArrowRight className="h-3 w-3" />
        </Link>
      </motion.div>

      <motion.div
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <MetricCard icon={Target} value={analytics.totalQuizzes} label="Quizzes Taken" color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" />
        <MetricCard icon={TrendingUp} value={`${analytics.averageScore}%`} label="Average Score" color="text-emerald-500" bg="bg-emerald-50 dark:bg-emerald-500/10" />
        <MetricCard icon={Trophy} value={analytics.totalCorrect} label="Correct Answers" color="text-amber-500" bg="bg-amber-50 dark:bg-amber-500/10" />
        <MetricCard icon={BookOpen} value={analytics.totalQuestions} label="Total Questions" color="text-violet-500" bg="bg-violet-50 dark:bg-violet-500/10" />
      </motion.div>

      {analytics.scoreHistory.length > 0 && (
        <motion.div
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <Zap className="h-4 w-4 text-indigo-500" /> Score Trend
          </h2>
          <div className="flex items-end gap-2 overflow-x-auto pb-2">
            {analytics.scoreHistory.map((point, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <span className="text-xs font-medium text-slate-500">{point.score}%</span>
                <div className="h-24 w-8 rounded-lg bg-slate-100 dark:bg-slate-800" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <motion.div
                    className={cn('w-full rounded-lg', point.score >= 75 ? 'bg-emerald-500' : point.score >= 50 ? 'bg-amber-500' : 'bg-rose-500')}
                    initial={{ height: '0%' }}
                    animate={{ height: `${point.score}%` }}
                    transition={{ duration: 0.6, delay: i * 0.06, ease: 'easeOut' }}
                    style={{ minHeight: '4px' }}
                  />
                </div>
                <TrendingUp className={cn('h-3 w-3', point.score >= 75 ? 'text-emerald-500' : point.score >= 50 ? 'text-amber-500' : 'text-rose-500')} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {analytics.weakTopics.length > 0 && (
        <motion.div
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
            <Target className="h-4 w-4 text-rose-500" /> Areas to Improve
          </h2>
          <div className="space-y-3">
            {analytics.weakTopics.map((topic, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{topic.topic}</span>
                  <span className={cn('text-sm font-semibold', topic.score >= 75 ? 'text-emerald-500' : topic.score >= 50 ? 'text-amber-500' : 'text-rose-500')}>
                    {topic.score}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.div
                    className={cn('h-full rounded-full', topic.score >= 75 ? 'bg-emerald-500' : topic.score >= 50 ? 'bg-amber-500' : 'bg-rose-500')}
                    initial={{ width: '0%' }}
                    animate={{ width: `${topic.score}%` }}
                    transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {analytics.recentResults.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Recent Results</h2>
          <div className="space-y-2">
            {analytics.recentResults.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <motion.div
                  className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', r.score >= 75 ? 'bg-emerald-100 dark:bg-emerald-500/10' : 'bg-amber-100 dark:bg-amber-500/10')}
                  whileHover={{ scale: 1.15, rotate: 5 }}
                >
                  {r.score >= 75 ? <Trophy className="h-5 w-5 text-emerald-600" /> : <TrendingUp className="h-5 w-5 text-amber-600" />}
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">Score: {r.score}%</p>
                  <p className="text-xs text-slate-500">{r.correctCount}/{r.totalQuestions} correct</p>
                </div>
                <span className="text-xs text-slate-400">{new Date(r.completedAt).toLocaleDateString()}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, value, label, color, bg }: { icon: React.ComponentType<{ className?: string }>; value: string | number; label: string; color: string; bg: string }) {
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
