import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Loader2, Send, Trophy, Clock, ListChecks,
  Check, CheckCircle2, XCircle, AlertTriangle, Flag,
} from 'lucide-react';
import { useToast } from '../components/toast/ToastProvider';
import AnimatedSpinner from '../components/AnimatedSpinner';
import { fadeUp } from '../utils/animations';
import { startCompetitionSession, submitCompetition } from '../services/api';
import type { CompetitionQuestion, CompetitionSession } from '../types';

interface SubmittedResult {
  score: number;
  correctAnswers: number;
  answeredQuestions: number;
  totalQuestions: number;
  timeSpent: number;
}

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function optionLetter(i: number): string {
  return String.fromCharCode(65 + i);
}

export default function TakeCompetition() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [session, setSession] = useState<CompetitionSession | null>(null);
  const [questions, setQuestions] = useState<CompetitionQuestion[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | boolean | null>>({});
  const [submitBusy, setSubmitBusy] = useState(false);
  const [result, setResult] = useState<SubmittedResult | null>(null);
  const [completionStatus, setCompletionStatus] = useState<'live' | 'finished' | null>(null);
  const [livePromptDismissed, setLivePromptDismissed] = useState(false);

  const startedRef = useRef<string | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    startCompetitionSession(id)
      .then((res) => {
        if (!mounted) return;
        setSession(res.session);
        setQuestions(res.questions);
        setTitle(res.competition.title);
        startedRef.current = res.session.startedAt;
      })
      .catch((e) => {
        if (!mounted) return;
        setError((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Unable to open this competition.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const submit = useCallback(
    async (onTimeout = false) => {
      if (!session || submittedRef.current) return;
      if (!onTimeout) submittedRef.current = true;
      setSubmitBusy(true);
      try {
        const timeSpent = startedRef.current
          ? Math.max(1, Math.round((Date.now() - new Date(startedRef.current).getTime()) / 1000))
          : 0;
        const payload = questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? null }));
        const res = await submitCompetition(id, { answers: payload, timeSpent });
        setResult(res.result);
        setCompletionStatus(res.competition.status === 'finished' ? 'finished' : 'live');
        toast.success('Results submitted!');
      } catch {
        submittedRef.current = false;
        toast.error('Could not submit your answers. Please try again.');
      } finally {
        setSubmitBusy(false);
      }
    },
    [session, questions, answers, id, toast]
  );

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!session || result) return;
    const interval = window.setInterval(() => {
      const msLeft = new Date(session.endsAt).getTime() - Date.now();
      setNow(Date.now());
      if (msLeft <= 0) {
        window.clearInterval(interval);
        void submit(true);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [session, result, submit]);

  const secondsLeft = useMemo(() => {
    if (!session) return 0;
    return Math.max(0, Math.floor((new Date(session.endsAt).getTime() - now) / 1000));
  }, [session, now]);

  useEffect(() => {
    if (result || submittedRef.current) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [result]);

  const answeredCount = useMemo(() => Object.values(answers).filter((a) => a !== null && a !== undefined && String(a).trim() !== '').length, [answers]);
  const answeredPct = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const selectAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [questions[current].id]: value }));
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <AnimatedSpinner label="Preparing your test..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
            <AlertTriangle className="h-7 w-7 text-rose-500" aria-hidden="true" />
          </span>
          <p className="mt-4 text-base font-semibold text-slate-800 dark:text-white">Can't start this test</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <div className="mt-5 flex gap-2">
            <Link
              to="/competitions"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Back to competitions
            </Link>
            <Link
              to={`/competitions/${id}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              View competition
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (result) {
    const passed = result.score >= 50;
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className={`bg-gradient-to-br p-6 text-center text-white ${passed ? 'from-indigo-500 to-indigo-700' : 'from-slate-600 to-slate-800'}`}>
            {passed ? (
              <CheckCircle2 className="mx-auto h-10 w-10" aria-hidden="true" />
            ) : (
              <XCircle className="mx-auto h-10 w-10" aria-hidden="true" />
            )}
            <p className="mt-3 text-lg font-bold">{title}</p>
            <p className="text-4xl font-extrabold tracking-tight">{result.score}%</p>
            <p className="mt-1 text-sm opacity-90">
              {result.correctAnswers} of {result.totalQuestions} correct
            </p>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-3 gap-4 text-center">
              <div>
                <dt className="text-xs text-slate-400">Answered</dt>
                <dd className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{result.answeredQuestions}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Correct</dt>
                <dd className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{result.correctAnswers}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Time used</dt>
                <dd className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {Math.floor(result.timeSpent / 60)}m {result.timeSpent % 60}s
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
              {completionStatus === 'finished'
                ? 'The leaderboard is locked in — see how you ranked.'
                : 'The leaderboard will finalize once every player finishes their timed session.'}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                to={`/competitions/${id}`}
                className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              >
                <Trophy className="h-5 w-5" aria-hidden="true" /> View leaderboard
              </Link>
              <Link
                to="/competitions"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-6 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                All competitions
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <AnimatedSpinner label="Loading questions..." />
        <p className="mt-3 text-center text-xs text-slate-400">
          If this takes too long, <Link to={`/competitions/${id}`} className="text-indigo-500 underline">return to the competition</Link>.
        </p>
      </div>
    );
  }

  const q = questions[current];
  const timeLow = secondsLeft <= 60;

  return (
    <div className="min-h-screen bg-slate-50 pb-28 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Question {current + 1} of {questions.length} · {answeredCount} answered
            </p>
          </div>
          <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 sm:block">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all"
              style={{ width: `${answeredPct}%` }}
            />
          </div>
          <span
            role="timer"
            aria-label="Time remaining"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-sm font-bold tabular-nums ${
              timeLow ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            <Clock className="h-4 w-4" aria-hidden="true" />
            {formatCountdown(secondsLeft)}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6">
        <motion.div key={q.id} variants={fadeUp} initial="hidden" animate="show" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {q.subject && (
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold capitalize text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                {q.subject}
              </span>
            )}
            {q.difficulty && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium capitalize text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {q.difficulty}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-relaxed text-slate-900 dark:text-white">{q.question}</h2>

          <div className="mt-5 space-y-2.5" role="radiogroup" aria-label={`Options for question ${current + 1}`}>
            {q.options.map((option, index) => {
              const selected = answers[q.id] === option;
              return (
                <button
                  key={index}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => selectAnswer(option)}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                    selected
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20 dark:bg-indigo-500/10'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                      selected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {optionLetter(index)}
                  </span>
                  <span className="break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{option}</span>
                  {selected && <Check className="ml-auto mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </motion.div>

        {!livePromptDismissed && answeredCount > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            <p className="flex items-center gap-2">
              <Flag className="h-4 w-4 shrink-0" aria-hidden="true" />
              Everyone races on their own timer. Submit before time runs out to lock in your score.
            </p>
            <button
              type="button"
              onClick={() => setLivePromptDismissed(true)}
              aria-label="Dismiss"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-amber-600 transition hover:bg-amber-100 dark:hover:bg-amber-500/10"
            >
              <XSmallIcon />
            </button>
          </div>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            aria-label="Previous question"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prev
          </button>

          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{answeredCount}/{questions.length}</span>
          </div>

          {current === questions.length - 1 ? (
            <button
              type="button"
              disabled={submitBusy}
              onClick={() => void submit(false)}
              className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
              Submit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              className="inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function XSmallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}