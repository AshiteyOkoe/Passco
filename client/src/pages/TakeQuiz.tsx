import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getQuizById, submitQuiz } from '../services/api';
import { cn } from '../utils';
import {
  ChevronLeft, ChevronRight, Flag, Send, Clock,
  CheckCircle2, XCircle, Menu, AlertTriangle, Check,
  Loader2
} from 'lucide-react';
import { cardFlip, shakeVariants, fadeUp, bounceIn } from '../utils/animations';
import type { Quiz, QuizAnswer, Question } from '../types';

export default function TakeQuiz() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, QuizAnswer>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState(0);
  const startTimeRef = useRef(Date.now());
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    getQuizById(id!)
      .then(res => {
        setQuiz(res.quiz);
        setTimeRemaining(res.quiz.timeLimit);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const currentQuestion: Question | undefined = quiz?.questions[currentIndex];

  const handleAnswer = useCallback((answer: string | boolean) => {
    if (!currentQuestion) return;
    setAnswers(prev => {
      const next = new Map(prev);
      const existing = next.get(currentQuestion._id);
      next.set(currentQuestion._id, { questionId: currentQuestion._id, answer, flagged: existing?.flagged ?? false });
      return next;
    });
  }, [currentQuestion]);

  const handleFlag = useCallback(() => {
    if (!currentQuestion) return;
    setAnswers(prev => {
      const next = new Map(prev);
      const existing = next.get(currentQuestion._id);
      next.set(currentQuestion._id, { questionId: currentQuestion._id, answer: existing?.answer ?? null, flagged: !(existing?.flagged ?? false) });
      return next;
    });
  }, [currentQuestion]);

  const goNext = () => {
    if (currentIndex < (quiz?.questions.length ?? 1) - 1) {
      setDirection(1);
      setCurrentIndex(i => i + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(i => i - 1);
    }
  };

  const handleFinish = useCallback(async () => {
    if (hasSubmittedRef.current || !quiz) return;
    hasSubmittedRef.current = true;
    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const answerArray = quiz.questions.map(q => ({
      questionId: q._id,
      answer: answers.get(q._id)?.answer ?? null,
      flagged: answers.get(q._id)?.flagged ?? false,
    }));
    try {
      await submitQuiz(quiz._id, { answers: answerArray, timeTaken });
      navigate(`/quiz/${quiz._id}/results`);
    } catch {
      alert('Failed to submit quiz.');
      hasSubmittedRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }, [answers, quiz, navigate]);

  useEffect(() => {
    if (timeRemaining <= 0) { handleFinish(); return; }
    const timer = setTimeout(() => setTimeRemaining(p => Math.max(0, p - 1)), 1000);
    return () => clearTimeout(timer);
  }, [timeRemaining, handleFinish]);

  if (loading) return <div className="flex items-center justify-center p-12"><AnimatedSpinner label="Loading quiz..." /></div>;
  if (!quiz) return <div className="p-12 text-center text-slate-500">Quiz not found</div>;

  const answeredCount = Array.from(answers.values()).filter(a => a.answer !== null && a.answer !== undefined && a.answer !== '').length;
  const progress = (answeredCount / quiz.questions.length) * 100;
  const unansweredCount = quiz.questions.length - answeredCount;

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSidebar(!showSidebar)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 sm:hidden dark:bg-slate-800 dark:text-slate-400" aria-label="Toggle question sidebar">
              <Menu className="h-4 w-4" />
            </button>
            <Send className="hidden h-4 w-4 text-indigo-500 sm:block" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{quiz.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <Timer timeRemaining={timeRemaining} totalTime={quiz.timeLimit} />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowSubmitModal(true)}
              className="hidden sm:flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Send className="h-3.5 w-3.5" /> Submit
            </motion.button>
          </div>
        </div>
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-900">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex gap-6">
          <div className="flex-1">
            <AnimatePresence mode="wait" custom={direction}>
              {currentQuestion && (
                <QuestionCard
                  key={currentQuestion._id}
                  question={currentQuestion}
                  answer={answers.get(currentQuestion._id)}
                  onAnswer={handleAnswer}
                  onFlag={handleFlag}
                  questionNumber={currentIndex + 1}
                  totalQuestions={quiz.questions.length}
                  direction={direction}
                />
              )}
            </AnimatePresence>

            <motion.div
              className="mt-8 flex items-center justify-between"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <motion.button
                whileHover={currentIndex > 0 ? { scale: 1.03 } : {}}
                whileTap={currentIndex > 0 ? { scale: 0.97 } : {}}
                onClick={goPrev}
                disabled={currentIndex === 0}
                className={cn('flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition', currentIndex === 0 ? 'pointer-events-none text-slate-300' : 'bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800')}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </motion.button>
              <span className="flex items-center gap-2 text-sm text-slate-500">
                <Send className="h-3.5 w-3.5 text-indigo-400" />
                {currentIndex + 1} / {quiz.questions.length}
              </span>
              {currentIndex < quiz.questions.length - 1 ? (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={goNext}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Send className="h-3.5 w-3.5" /> Finish
                </motion.button>
              )}
            </motion.div>
          </div>

          <QuestSidebar
            questions={quiz.questions}
            answers={answers}
            currentIndex={currentIndex}
            answeredCount={answeredCount}
            showSidebar={showSidebar}
            onSelect={(i) => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); setShowSidebar(false); }}
            onClose={() => setShowSidebar(false)}
          />
        </div>
      </div>

      <AnimatePresence>
        {showSubmitModal && (
          <SubmitModal
            answeredCount={answeredCount}
            totalQuestions={quiz.questions.length}
            unansweredCount={unansweredCount}
            flaggedCount={Array.from(answers.values()).filter(a => a.flagged).length}
            submitting={submitting}
            onConfirm={handleFinish}
            onCancel={() => setShowSubmitModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Timer({ timeRemaining, totalTime }: { timeRemaining: number; totalTime: number }) {
  const percentage = (timeRemaining / totalTime) * 100;
  const isLow = timeRemaining <= 60;
  const isCritical = timeRemaining <= 30;
  return (
    <motion.div
      className={cn('flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-mono font-semibold', isCritical ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : isLow ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')}
      animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
      transition={isCritical ? { duration: 1, repeat: Infinity } : {}}
    >
      <Clock className={cn('h-4 w-4', isCritical && 'animate-pulse')} />
      <span>{Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}</span>
      <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 sm:block">
        <motion.div
          className={cn('h-full rounded-full', isCritical ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-indigo-500')}
          initial={{ width: '100%' }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </motion.div>
  );
}

function QuestionCard({ question, answer, onAnswer, onFlag, questionNumber, totalQuestions, direction }: {
  question: Question; answer: QuizAnswer | undefined; onAnswer: (a: string | boolean) => void; onFlag: () => void; questionNumber: number; totalQuestions: number; direction: number;
}) {
  const isFlagged = answer?.flagged ?? false;
  const selectedAnswer = answer?.answer;
  const [showShake, setShowShake] = useState(false);

  const handleOptionClick = (option: string | boolean) => {
    onAnswer(option);
  };

  return (
    <motion.div
      custom={direction}
      variants={cardFlip}
      initial="enter"
      animate="center"
      exit="exit"
      style={{ perspective: 1000 }}
      className="w-full"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          >
            {questionNumber}
          </motion.span>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {question.type === 'multiple-choice' ? 'Multiple Choice' : 'True / False'}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onFlag}
          className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition', isFlagged ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-400 hover:text-amber-500 dark:bg-slate-800 dark:text-slate-500')}
          aria-label={isFlagged ? 'Unflag question' : 'Flag question'}
        >
          <Flag className="h-4 w-4" fill={isFlagged ? 'currentColor' : 'none'} />
        </motion.button>
      </div>

      <motion.h3
        className="mb-6 text-lg font-semibold leading-relaxed text-slate-900 dark:text-white"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        {question.question}
      </motion.h3>

      {question.type === 'multiple-choice' && question.options && (
        <div className="space-y-2.5">
          {question.options.map((option, i) => (
            <motion.button
              key={i}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={i}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleOptionClick(option)}
              className={cn('group flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all', selectedAnswer === option ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/5' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/50')}
            >
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-semibold', selectedAnswer === option ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400')}>
                {String.fromCharCode(65 + i)}
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{option}</span>
            </motion.button>
          ))}
        </div>
      )}

      {question.type === 'true-false' && (
        <motion.div
          className="grid grid-cols-2 gap-3"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          {[true, false].map((value) => (
            <motion.button
              key={String(value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOptionClick(value)}
              className={cn('flex items-center justify-center gap-2 rounded-xl border-2 p-5 text-base font-semibold transition-all', selectedAnswer === value ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/5 dark:text-indigo-300' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}
            >
              {value ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {value ? 'True' : 'False'}
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function QuestSidebar({ questions, answers, currentIndex, answeredCount, showSidebar, onSelect, onClose }: {
  questions: Question[]; answers: Map<string, QuizAnswer>; currentIndex: number; answeredCount: number; showSidebar: boolean; onSelect: (i: number) => void; onClose: () => void;
}) {
  return (
    <>
      <motion.div
        className={cn('w-64 shrink-0', !showSidebar && 'hidden lg:block', showSidebar && 'fixed inset-y-16 right-0 z-50 block w-72 border-l border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900')}
        initial={showSidebar ? { x: 300 } : false}
        animate={showSidebar ? { x: 0 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Questions</h4>
            <Send className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((q, i) => {
              const qAnswer = answers.get(q._id);
              const isAnswered = qAnswer?.answer !== null && qAnswer?.answer !== undefined && qAnswer?.answer !== '';
              const isCurrent = i === currentIndex;
              const isFlagged = qAnswer?.flagged ?? false;
              return (
                <motion.button
                  key={q._id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.02, type: 'spring', stiffness: 200 }}
                  onClick={() => onSelect(i)}
                  className={cn('relative flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold transition', isCurrent && 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900', isAnswered && !isCurrent && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400', !isAnswered && !isCurrent && 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500')}
                  aria-label={`Question ${i + 1}${isAnswered ? ' answered' : ''}${isFlagged ? ' flagged' : ''}`}
                >
                  {i + 1}
                  {isFlagged && <Flag className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-amber-500" fill="currentColor" />}
                </motion.button>
              );
            })}
          </div>
          <motion.div
            className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex justify-between text-xs"><span className="text-slate-500">Answered</span><span className="font-semibold text-slate-700">{answeredCount}/{questions.length}</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-500">Remaining</span><span className="font-semibold text-slate-700">{questions.length - answeredCount}</span></div>
          </motion.div>
        </div>
      </motion.div>
      {showSidebar && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />}
    </>
  );
}

function SubmitModal({ answeredCount, totalQuestions, unansweredCount, flaggedCount, submitting, onConfirm, onCancel }: {
  answeredCount: number; totalQuestions: number; unansweredCount: number; flaggedCount: number; submitting: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <div className="mb-4 flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, 10, 0] }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/10"
          >
            <Send className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </motion.div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submit Quiz?</h3>
        </div>
        <motion.div
          className="mb-6 space-y-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Answered
            </span>
            <span className="font-semibold text-slate-800 dark:text-white">{answeredCount}/{totalQuestions}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-500">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Unanswered
            </span>
            <span className="font-semibold text-amber-600">{unansweredCount}</span>
          </div>
          {flaggedCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-500">
                <Flag className="h-4 w-4 text-amber-500" /> Flagged
              </span>
              <span className="font-semibold text-amber-600">{flaggedCount}</span>
            </div>
          )}
        </motion.div>
        {unansweredCount > 0 && (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {unansweredCount} question{unansweredCount > 1 ? 's' : ''} not answered
          </motion.p>
        )}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
          >
            <ChevronLeft className="h-4 w-4" /> Go Back
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> {submitting ? 'Submitting...' : 'Submit Quiz'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AnimatedSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        className="relative flex h-12 w-12 items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 border-r-indigo-400/60" />
        <Loader2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </motion.div>
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}
