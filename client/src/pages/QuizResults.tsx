import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getResultById } from '../services/api';
import { cn } from '../utils';
import { SuccessCelebration } from '../components/icons/Illustrations';
import {
  CheckCircle2, XCircle, RotateCcw, Clock, Trophy, ClipboardCheck
} from 'lucide-react';
import { bounceIn, fadeUp, stagger } from '../utils/animations';
import Confetti from '../components/Confetti';
import type { Result } from '../types';

export default function QuizResults() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    getResultById(id!)
      .then(res => {
        setResult(res.result);
        if (res.result.score >= 75) {
          setShowConfetti(true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!result) return;
    const target = result.score;
    const duration = 1000;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedScore(target);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [result]);

  if (loading) return <div className="flex items-center justify-center p-12"><Spinner /></div>;
  if (!result) return <div className="p-12 text-center text-slate-500">Result not found</div>;

  const percentage = result.score;

  const grade = percentage >= 90 ? { label: 'Excellent', color: 'text-emerald-500' } :
    percentage >= 75 ? { label: 'Great', color: 'text-indigo-500' } :
    percentage >= 60 ? { label: 'Good', color: 'text-amber-500' } :
    percentage >= 40 ? { label: 'Needs Work', color: 'text-orange-500' } :
    { label: 'Keep Trying', color: 'text-rose-500' };

  const quizTitle = typeof result.quizId === 'object' ? result.quizId.title : 'Quiz';

  const circleCircumference = 402;

  return (
    <div className="p-6">
      <Confetti active={showConfetti} duration={3500} />
      <div className="mx-auto max-w-4xl">
        <motion.div
          className="mb-8 text-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {percentage >= 75 && (
            <motion.div variants={bounceIn}>
              <SuccessCelebration size="sm" className="mx-auto mb-4" />
            </motion.div>
          )}

          <motion.div className="mb-4 inline-flex items-center justify-center" variants={bounceIn}>
            <div className={cn('relative flex h-36 w-36 items-center justify-center rounded-full', percentage >= 60 ? 'bg-emerald-50 dark:bg-emerald-500/5' : 'bg-rose-50 dark:bg-rose-500/5')}>
              <svg className="absolute inset-0 h-36 w-36 -rotate-90" role="img" aria-label={`Score: ${percentage}%`}>
                <circle cx="72" cy="72" r="64" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-800" />
                <motion.circle
                  cx="72" cy="72" r="64" fill="none" stroke="currentColor" strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 402' }}
                  animate={{ strokeDasharray: `${(animatedScore / 100) * circleCircumference} ${circleCircumference}` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={cn(percentage >= 75 ? 'text-emerald-500' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500')}
                />
              </svg>
              <div className="text-center">
                <motion.p
                  className="text-3xl font-bold text-slate-900 dark:text-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.5 }}
                >
                  {animatedScore}%
                </motion.p>
                <p className={cn('text-xs font-semibold', grade.color)}>{grade.label}</p>
              </div>
            </div>
          </motion.div>

          <motion.h2
            className="text-2xl font-bold text-slate-900 dark:text-white"
            variants={fadeUp}
          >
            {quizTitle}
          </motion.h2>

          <motion.div className="mt-2 flex items-center justify-center gap-1 text-sm text-slate-500" variants={fadeUp}>
            <motion.div
              animate={percentage >= 75 ? { scale: [1, 1.05, 1], opacity: [0.7, 1, 0.7] } : { scale: 1, opacity: 0.7 }}
              transition={percentage >= 75 ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
            >
              <Trophy className={cn('h-4 w-4', percentage >= 75 ? 'text-emerald-500' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500')} />
            </motion.div>
            <span>{grade.label} performance</span>
          </motion.div>
        </motion.div>

        <motion.div
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <StatCard icon={CheckCircle2} value={result.correctCount} label="Correct" color="text-emerald-500" index={0} />
          <StatCard icon={XCircle} value={result.incorrectCount} label="Incorrect" color="text-rose-500" index={1} />
          <StatCard icon={RotateCcw} value={result.skippedCount} label="Skipped" color="text-slate-400" index={2} />
          <StatCard icon={Clock} value={`${Math.floor(result.timeTaken / 60)}:${(result.timeTaken % 60).toString().padStart(2, '0')}`} label="Time" color="text-indigo-500" index={3} />
        </motion.div>

        {result.answers.length > 0 && (
          <motion.div
            className="mb-8"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
          >
            <h3 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Question Review</h3>
            <div className="space-y-3">
              {result.answers.map((answer, i) => (
                <motion.div
                  key={answer.questionId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={cn('rounded-xl border bg-white p-4 dark:bg-slate-900', answer.isCorrect ? 'border-emerald-200 dark:border-emerald-800/30' : answer.userAnswer === null ? 'border-slate-200 dark:border-slate-800' : 'border-rose-200 dark:border-rose-800/30')}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold', answer.isCorrect ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 dark:text-white">
                        {answer.isCorrect ? 'Correct' : answer.userAnswer === null ? 'Skipped' : 'Incorrect'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {answer.isCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                      {!answer.isCorrect && answer.userAnswer !== null && <XCircle className="h-5 w-5 text-rose-500" />}
                      {answer.userAnswer === null && <RotateCcw className="h-5 w-5 text-slate-400" />}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          className="flex gap-3"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <Link to="/assessment/setup" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
            <ClipboardCheck className="h-4 w-4" /> New Assessment
          </Link>
          <Link to="/" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
            <Trophy className="h-4 w-4" /> Dashboard
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color, index }: { icon: React.ComponentType<{ className?: string }>; value: number | string; label: string; color: string; index: number }) {
  return (
    <motion.div
      variants={bounceIn}
      custom={index}
      whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
      className="rounded-xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 200 }}
      >
        <Icon className={cn('mx-auto mb-2 h-6 w-6', color)} />
      </motion.div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="relative flex h-12 w-12 items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 border-r-indigo-400/60" />
        <Trophy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </motion.div>
      <p className="text-sm text-slate-500">Loading results...</p>
    </div>
  );
}
