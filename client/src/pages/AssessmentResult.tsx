import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, RotateCcw, Clock, Trophy, Download, Home, ArrowLeft, Flag, BookOpen, Target, AlertCircle
} from 'lucide-react';
import { cn } from '../utils';
import { bounceIn, fadeUp, stagger } from '../utils/animations';
import Confetti from '../components/Confetti';
import { SuccessCelebration } from '../components/icons/Illustrations';
import type { AssessmentResult as AssessmentResultType } from '../types';

interface AssessmentResultState extends AssessmentResultType {
  subject?: string;
}

function getGrade(percentage: number): { letter: string; color: string; label: string } {
  if (percentage >= 90) return { letter: 'A+', color: 'text-emerald-500', label: 'Outstanding' };
  if (percentage >= 80) return { letter: 'A', color: 'text-emerald-500', label: 'Excellent' };
  if (percentage >= 70) return { letter: 'B', color: 'text-indigo-500', label: 'Good' };
  if (percentage >= 60) return { letter: 'C', color: 'text-amber-500', label: 'Fair' };
  if (percentage >= 50) return { letter: 'D', color: 'text-orange-500', label: 'Passing' };
  return { letter: 'F', color: 'text-rose-500', label: 'Needs Improvement' };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AssessmentResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as AssessmentResultState | null;
  const result = locationState;
  const subject = locationState?.subject;

  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result) {
      navigate('/assessment/setup', { replace: true });
    }
  }, [result, navigate]);

  useEffect(() => {
    if (!result) return;
    if (result.passed && !result.abandoned) {
      setShowConfetti(true);
    }
  }, [result]);

  useEffect(() => {
    if (!result) return;
    const target = result.percentage;
    const duration = 1200;
    const steps = 40;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setAnimatedPercentage(target);
        clearInterval(timer);
      } else {
        setAnimatedPercentage(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [result]);

  if (!result) return null;

  const grade = getGrade(result.percentage);
  const circumference = 2 * Math.PI * 68;
  const offset = circumference - (animatedPercentage / 100) * circumference;

  const toggleQuestion = (index: number) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handlePrint = () => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        #result-content, #result-content * { visibility: visible; }
        #result-content { position: absolute; left: 0; top: 0; width: 100%; }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  const formattedDate = new Date(result.completedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div ref={resultRef} className="min-h-screen bg-slate-50 py-8 dark:bg-slate-950">
      <Confetti active={showConfetti} duration={4000} />
      <div id="result-content" className="mx-auto max-w-4xl px-4">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className={cn(
                'no-print flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition',
                'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4" />
              <span>{formattedDate}</span>
            </div>
          </motion.div>

          {result.abandoned && (
            <motion.div
              variants={fadeUp}
              className="rounded-2xl border-2 border-dashed border-rose-300 bg-gradient-to-r from-rose-50 to-orange-50 p-6 text-center dark:border-rose-700 dark:from-rose-500/10 dark:to-orange-500/10"
            >
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/20">
                <AlertCircle className="h-7 w-7 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-rose-700 dark:text-rose-300">Assessment Abandoned</h3>
              <p className="mt-1 text-sm text-rose-600/80 dark:text-rose-400/80">
                You left this assessment without submitting. A score of <span className="font-bold">0%</span> has been recorded and will affect your progress.
              </p>
            </motion.div>
          )}

          {result.passed && !result.abandoned && (
            <motion.div variants={bounceIn} className="flex justify-center">
              <SuccessCelebration size="sm" className="max-w-[200px]" />
            </motion.div>
          )}

          <motion.div variants={bounceIn} className="flex justify-center">
            <div className="relative flex h-44 w-44 items-center justify-center">
              <svg className="absolute inset-0 h-44 w-44 -rotate-90" viewBox="0 0 156 156">
                <circle
                  cx="78" cy="78" r="68"
                  fill="none"
                  strokeWidth="8"
                  className="text-slate-200 dark:text-slate-800"
                />
                <motion.circle
                  cx="78" cy="78" r="68"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: offset }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className={cn(
                    result.passed ? 'stroke-emerald-500' : 'stroke-rose-500'
                  )}
                />
              </svg>
              <div className="text-center">
                <motion.p
                  className="text-4xl font-bold text-slate-900 dark:text-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.6 }}
                >
                  {animatedPercentage}%
                </motion.p>
                <motion.p
                  className={cn('text-lg font-bold', grade.color)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  {grade.letter}
                </motion.p>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="text-center">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold',
                result.abandoned
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                  : result.passed
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
              )}
            >
              {result.abandoned ? (
                <AlertCircle className="h-4 w-4" />
              ) : result.passed ? (
                <Trophy className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              {result.abandoned ? 'Abandoned' : result.passed ? 'Passed' : 'Failed'}
            </span>
            <p className={cn('mt-1 text-sm font-medium', grade.color)}>
              {grade.label}
            </p>
            {subject && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                <BookOpen className="h-3 w-3" />
                {subject}
              </span>
            )}
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <BookOpen className="h-4 w-4 text-indigo-500" />
              Student Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{result.studentName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Class</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{result.classLevel}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Difficulty</p>
                <p className="font-medium capitalize text-slate-800 dark:text-slate-200">{result.difficulty}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Assessment Type</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">{result.assessmentType}</p>
              </div>
              {subject && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Subject</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{subject}</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            variants={stagger}
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <motion.div
              variants={bounceIn}
              custom={0}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
            >
              <Target className="mx-auto mb-2 h-6 w-6 text-indigo-500" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{result.totalQuestions}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
            </motion.div>
            <motion.div
              variants={bounceIn}
              custom={1}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
            >
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{result.correctAnswers}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Correct</p>
            </motion.div>
            <motion.div
              variants={bounceIn}
              custom={2}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
            >
              <XCircle className="mx-auto mb-2 h-6 w-6 text-rose-500" />
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{result.wrongAnswers}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Wrong</p>
            </motion.div>
            <motion.div
              variants={bounceIn}
              custom={3}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-center dark:border-slate-800 dark:bg-slate-900"
            >
              <Clock className="mx-auto mb-2 h-6 w-6 text-indigo-500" />
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatTime(result.timeUsed)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Time Used</p>
            </motion.div>
          </motion.div>

          {result.answers.length > 0 && (
            <motion.div variants={fadeUp}>
              <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
                Answer Review
              </h3>
              <div className="space-y-3">
                {result.answers.map((answer, i) => {
                  const isExpanded = expandedQuestions.has(i);
                  return (
                    <motion.div
                      key={answer.questionId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={cn(
                        'rounded-2xl border bg-white transition dark:bg-slate-900',
                        answer.isCorrect
                          ? 'border-emerald-200 dark:border-emerald-800/30'
                          : 'border-rose-200 dark:border-rose-800/30'
                      )}
                    >
                      <button
                        onClick={() => toggleQuestion(i)}
                        className="flex w-full items-start gap-3 p-4 text-left"
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
                            answer.isCorrect
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                          )}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-white line-clamp-2">
                            {answer.question}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              )}
                            >
                              <BookOpen className="h-3 w-3" />
                              {answer.subject}
                            </span>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              )}
                            >
                              {answer.type === 'true-false' ? 'True/False' : 'Multiple Choice'}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {answer.isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-rose-500" />
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-800"
                        >
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-xs text-slate-500 dark:text-slate-400">Your Answer: </span>
                              <span
                                className={cn(
                                  'inline-block rounded-lg px-2 py-0.5 text-xs font-medium',
                                  answer.isCorrect
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                                )}
                              >
                                {String(answer.userAnswer ?? '(No answer)')}
                              </span>
                            </div>
                            {!answer.isCorrect && (
                              <div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Correct Answer: </span>
                                <span className="inline-block rounded-lg bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                                  {String(answer.correctAnswer)}
                                </span>
                              </div>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-medium text-slate-700 dark:text-slate-300">Explanation: </span>
                              {answer.explanation}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          <motion.div
            variants={fadeUp}
            className="no-print flex flex-col gap-3 sm:flex-row"
          >
            <button
              onClick={handlePrint}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              Download Result as PDF
            </button>
            <Link
              to="/assessment/setup"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-6 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-800/30 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
            >
              <RotateCcw className="h-4 w-4" />
              Retake Assessment
            </Link>
            <Link
              to="/dashboard"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Home className="h-4 w-4" />
              Return to Dashboard
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
