import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  Menu,
  AlertTriangle,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Navigation,
  MoreHorizontal,
} from 'lucide-react';
import { getQuestions, shuffleArray, ASSESSMENT_META, ClassLevel, AssessmentType, BankQuestion, DifficultyLevel } from '../data/questionBank';
import { saveAssessmentResult, saveAssessmentResultKeepalive, getApprovedBankQuestions, logAttemptEvent, reportQuestion } from '../services/api';
import SubscriptionGate from '../components/SubscriptionGate';
import { useBeceEligibility } from '../hooks/useBeceEligibility';
import { useToast } from '../components/toast/ToastProvider';
import { composeAssessment, ASSESSMENT_MIX } from '../utils/assessmentMixer';
import { cn } from '../utils';
import { cardFlip, fadeUp, bounceIn } from '../utils/animations';

interface LocationState {
  classLevel: ClassLevel;
  subject?: string;
  assessmentType: AssessmentType;
}

function dedupeQuestions(questions: BankQuestion[]): BankQuestion[] {
  const seen = new Set<string>();
  const result: BankQuestion[] = [];
  for (const q of questions) {
    if (!q) continue;
    const key = q.question.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(q);
  }
  return result;
}

interface AssessmentAnswer {
  questionId: string;
  selectedOption: string | null;
  flagged: boolean;
  timestamp: number;
}

interface ScoreResult {
  questionId: string;
  correct: boolean;
  userAnswer: string | null;
  correctAnswer: string | boolean;
  marksObtained: number;
  marksPossible: number;
}

interface AssessmentComputed {
  scoreResults: ScoreResult[];
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
}

function normalizeTrueFalseAnswer(value: unknown): string | null {
  if (typeof value === 'boolean') return String(value);
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 't' || s === 'yes') return 'true';
  if (s === 'false' || s === '0' || s === 'f' || s === 'no') return 'false';
  return null;
}

function resolveCorrectAnswerText(q: BankQuestion): string {
  const raw = String(q.correctAnswer ?? '').trim();
  if (q.type === 'true-false') {
    return normalizeTrueFalseAnswer(q.correctAnswer) ?? raw.toLowerCase();
  }
  if (q.options?.length) {
    const exact = q.options.find((o) => o.trim().toLowerCase() === raw.toLowerCase());
    if (exact !== undefined) return exact.trim();
  }
  if (/^[A-D]$/i.test(raw) && q.options?.length) {
    const optionIndex = raw.toUpperCase().charCodeAt(0) - 65;
    return q.options?.[optionIndex]?.trim() ?? raw;
  }
  return raw;
}

function scoreAssessment(
  questions: BankQuestion[],
  answers: Map<string, AssessmentAnswer>
): AssessmentComputed {
  const scoreResults: ScoreResult[] = questions.map((q) => {
    const answer = answers.get(q.id);
    const userAnswer = answer?.selectedOption ?? null;
    const correctAnswer = resolveCorrectAnswerText(q);
    let resolvedAnswer: string;
    if (q.type === 'true-false') {
      resolvedAnswer = userAnswer === 'True' ? 'true' : 'false';
    } else {
      const optionIndex = userAnswer ? userAnswer.charCodeAt(0) - 65 : -1;
      resolvedAnswer = q.options?.[optionIndex]?.trim() ?? '';
    }
    const isCorrect = userAnswer !== null && resolvedAnswer === correctAnswer;
    const marksPossible = 1;
    return {
      questionId: q.id,
      correct: isCorrect,
      userAnswer,
      correctAnswer,
      marksObtained: isCorrect ? marksPossible : 0,
      marksPossible,
    };
  });

  const totalMarks = scoreResults.reduce((s, r) => s + r.marksPossible, 0);
  const obtainedMarks = scoreResults.reduce((s, r) => s + r.marksObtained, 0);
  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

  let grade = 'F';
  if (percentage >= 90) grade = 'A+';
  else if (percentage >= 80) grade = 'A';
  else if (percentage >= 70) grade = 'B';
  else if (percentage >= 60) grade = 'C';
  else if (percentage >= 50) grade = 'D';

  const passed = percentage >= 50;
  const answeredCount = Array.from(answers.values()).filter((a) => a.selectedOption !== null).length;
  const correctCount = scoreResults.filter((r) => r.correct).length;
  const wrongCount = questions.length - correctCount;

  return {
    scoreResults,
    totalMarks,
    obtainedMarks,
    percentage,
    grade,
    passed,
    answeredCount,
    correctCount,
    wrongCount,
  };
}

export default function TakeAssessmentWrapper() {
  const location = useLocation();
  const stateType = (location.state as LocationState | null)?.assessmentType;

  const resolvedType = (() => {
    if (stateType) return stateType;
    try {
      const raw = localStorage.getItem('passco-assessment-config');
      if (raw) return (JSON.parse(raw) as LocationState).assessmentType;
    } catch {
      // ignore
    }
    return undefined;
  })();

  const feature = resolvedType === 'mock' ? 'mocks' : 'examinations';
  const featureName = resolvedType === 'mock' ? 'Mock assessments' : 'Examinations';

  return (
    <SubscriptionGate feature={feature} featureName={featureName}>
      <TakeAssessment />
    </SubscriptionGate>
  );
}

function TakeAssessment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();

  // On a fresh navigation the config comes from location.state; after a refresh
  // it's lost, so fall back to the persisted config to keep the quiz open.
  const [state] = useState<LocationState>(() => {
    const fromLocation = location.state as LocationState | null;
    if (fromLocation?.classLevel && fromLocation?.assessmentType) {
      return fromLocation;
    }
    try {
      const raw = localStorage.getItem('passco-assessment-config');
      if (raw) {
        const parsed = JSON.parse(raw) as LocationState;
        if (parsed?.classLevel && parsed.assessmentType) return parsed;
      }
    } catch {
      // ignore
    }
    return fromLocation as LocationState;
  });

  const beceGateEnabled = state?.assessmentType === 'likely-bece';
  const { eligible: beceAchieved, usageLocked: beceUsageLocked } = useBeceEligibility(beceGateEnabled);

  useEffect(() => {
    if (state?.assessmentType !== 'likely-bece') return;
    if (beceUsageLocked) {
      toast.error('BECE attempts used for this window', 'You can retake Likely BECE once the 72-hour window reopens.');
      navigate('/assessment/setup');
      return;
    }
    if (beceAchieved === false) {
      toast.error('Requirements not met', 'Likely BECE is locked until you pass a mock and an examination in every subject, and reach a 70% average score.');
      navigate('/assessment/setup');
    }
  }, [state, beceAchieved, beceUsageLocked, navigate, toast]);

  const [backendByDifficulty, setBackendByDifficulty] = useState<Record<DifficultyLevel, BankQuestion[]>>({
    beginner: [],
    intermediate: [],
    expert: [],
  });

  useEffect(() => {
    if (!state) return;
    const mix = ASSESSMENT_MIX[state.assessmentType];
    const difficultyKeys = (Object.keys(mix) as DifficultyLevel[]).filter((d) => mix[d] > 0);

    Promise.all(
      difficultyKeys.map((difficulty) => {
        const params: Record<string, string | number> = {};
        if (state.subject) params.subject = state.subject;
        if (state.classLevel) params.classLevel = state.classLevel;
        params.difficulty = difficulty;
        params.count = mix[difficulty] + 5;
        return getApprovedBankQuestions(params)
          .then(({ questions }) => ({ difficulty, questions }))
          .catch(() => ({ difficulty, questions: [] }));
      })
    ).then((results) => {
      const next: Record<DifficultyLevel, BankQuestion[]> = { beginner: [], intermediate: [], expert: [] };
      for (const r of results) {
        next[r.difficulty] = r.questions.map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type as BankQuestion['type'],
          options: q.options,
          correctAnswer: q.correctAnswer,
          subject: q.subject || state.subject || '',
          explanation: q.explanation,
          difficulty: q.difficulty as DifficultyLevel,
        }));
      }
      setBackendByDifficulty(next);
    });
  }, [state]);

  const questions = useMemo(() => {
    if (!state) return [];
    const targetCount = ASSESSMENT_META[state.assessmentType].questionCount;
    const staticQs = getQuestions(state.classLevel, targetCount, state.subject);

    // Difficulty-weighted mix (backend by difficulty + static filler). Falls back
    // to the legacy all-sources shuffle if weighting couldn't reach the target.
    const weighted = composeAssessment(state.assessmentType, backendByDifficulty, staticQs, targetCount);
    if (weighted.length >= targetCount) return weighted;

    const combined = dedupeQuestions([
      ...backendByDifficulty.beginner,
      ...backendByDifficulty.intermediate,
      ...backendByDifficulty.expert,
      ...staticQs,
    ]);

    // Always reshuffle so every user (and every re-entry/refresh) gets a new order.
    const shuffled = shuffleArray(combined);

    const result: BankQuestion[] = [];
    for (let i = 0; i < targetCount; i++) {
      result.push(shuffled[i % shuffled.length]);
    }
    return result.filter(Boolean);
  }, [state, backendByDifficulty]);

  const meta = useMemo(() => {
    if (!state) return null;
    return ASSESSMENT_META[state.assessmentType];
  }, [state]);

  const storageKey = useMemo(() => {
    if (!state) return '';
    return `assessment-${state.classLevel}-${state.subject || 'all'}-${state.assessmentType}`;
  }, [state]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, AssessmentAnswer>>(new Map());
  const [timeLeft, setTimeLeft] = useState(meta?.timeLimit ?? 600);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const [showQuestion, setShowQuestion] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportNote, setReportNote] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState(false);
  const hasInteracted = useRef(false);

  const timerRef = useRef<HTMLDivElement>(null);
  const navigatorRef = useRef<HTMLDivElement>(null);
  const answersRef = useRef<Map<string, AssessmentAnswer>>(new Map());
  const timeLeftRef = useRef(meta?.timeLimit ?? 600);
  const questionsRef = useRef<BankQuestion[]>(questions);
  const metaRef = useRef(meta);
  const stateRef = useRef(state);
  const userRef = useRef(user);
  const isSubmittedRef = useRef(isSubmitted);
  const isAbandoningRef = useRef(isAbandoning);
  const leaveRecordedRef = useRef(false);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { metaRef.current = meta; }, [meta]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { isSubmittedRef.current = isSubmitted; }, [isSubmitted]);
  useEffect(() => { isAbandoningRef.current = isAbandoning; }, [isAbandoning]);

  useEffect(() => {
    if (!state || !meta) {
      navigate('/');
      return;
    }
  }, [state, meta, navigate]);

  // Track if user has answered any question
  useEffect(() => {
    const answeredCount = Array.from(answers.values()).filter(a => a.selectedOption !== null).length;
    hasInteracted.current = answeredCount > 0;
  }, [answers]);

  // Log start event on first load
  useEffect(() => {
    if (state) {
      logAttemptEvent({ assessmentType: state.assessmentType, eventType: 'start' }).catch(() => {});
    }
  }, []);

  // Tab-switch detection
  useEffect(() => {
    if (isSubmitted || isAbandoning) return;
    const handler = () => {
      if (document.hidden) {
        logAttemptEvent({ assessmentType: state?.assessmentType, eventType: 'tab_switch' }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [isSubmitted, isAbandoning, state]);

  // Warn on browser back / forward navigation
  useEffect(() => {
    if (isSubmitted || isAbandoning) return;
    const onPopState = () => {
      if (!isSubmitted) {
        setShowLeaveModal(true);
        window.history.pushState(null, '', window.location.href);
      }
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isSubmitted, isAbandoning]);

  const handleSubmit = useCallback(() => {
    if (isSubmitted) return;
    setIsSubmitting(true);
    setIsSubmitted(true);
    logAttemptEvent({ assessmentType: state?.assessmentType, eventType: 'submit' }).catch(() => {});

    const { scoreResults, totalMarks, obtainedMarks, percentage, grade, passed, answeredCount, correctCount, wrongCount } = scoreAssessment(questions, answers);
    const timeUsed = (meta?.timeLimit ?? 600) - timeLeft;

    const enrichedAnswers = scoreResults.map((sr, i) => {
      const q = questions[i];
      return {
        questionId: sr.questionId,
        question: q.question,
        type: q.type,
        options: q.options,
        userAnswer: sr.userAnswer,
        correctAnswer: sr.correctAnswer,
        isCorrect: sr.correct,
        subject: q.subject,
        explanation: q.explanation,
      };
    });

    const resultPayload = {
      answers: enrichedAnswers,
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
      passed,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      answeredQuestions: answeredCount,
      unansweredQuestions: questions.length - answeredCount,
      flaggedQuestions: Array.from(answers.values()).filter((a) => a.flagged).length,
      timeUsed,
      timeLimit: meta?.timeLimit ?? 600,
      classLevel: state?.classLevel,
      subject: state?.subject,
      assessmentType: state?.assessmentType,
      questions,
      studentName: user?.name || 'Student',
      completedAt: new Date().toISOString(),
    };

    const historyEntry = {
      classLevel: state?.classLevel,
      subject: state?.subject,
      assessmentType: state?.assessmentType,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      answeredQuestions: answeredCount,
      percentage,
      grade,
      passed,
      timeUsed,
      timestamp: Date.now(),
      completedAt: new Date().toISOString(),
      studentName: user?.name || 'Student',
      gender: user?.gender || '',
      institution: user?.institution || '',
      avatar: user?.avatar || '',
    };

    const existingHistory = JSON.parse(localStorage.getItem('assessment-history') || '[]');
    existingHistory.unshift(historyEntry);
    localStorage.setItem('assessment-history', JSON.stringify(existingHistory.slice(0, 50)));

    saveAssessmentResult({
      classLevel: state?.classLevel,
      subject: state?.subject,
      assessmentType: state?.assessmentType,
      totalQuestions: questions.length,
      answeredQuestions: answeredCount,
      correctAnswers: correctCount,
      timeLimit: meta?.timeLimit ?? 600,
      percentage,
      grade,
      passed,
      timeSpent: timeUsed,
      answers: scoreResults,
    }).catch(() => {});

    setTimeout(() => {
      navigate('/assessment/result', { state: resultPayload });
    }, 800);
  }, [answers, questions, meta, timeLeft, state, navigate, isSubmitted]);

  const persistAbandonedAssessment = useCallback((navigateAfter: boolean) => {
    if (leaveRecordedRef.current) return;
    leaveRecordedRef.current = true;

    const qs = questionsRef.current;
    const timeLimit = metaRef.current?.timeLimit ?? 600;
    const timeUsed = Math.max(0, timeLimit - timeLeftRef.current);
    const totalQuestions = qs.length;

    const { scoreResults, totalMarks, obtainedMarks, percentage, grade, passed, answeredCount, correctCount, wrongCount } = scoreAssessment(qs, answersRef.current);

    const enrichedAnswers = scoreResults.map((sr, i) => {
      const q = qs[i];
      return {
        questionId: sr.questionId,
        question: q.question,
        type: q.type,
        options: q.options,
        userAnswer: sr.userAnswer,
        correctAnswer: sr.correctAnswer,
        isCorrect: sr.correct,
        subject: q.subject,
        explanation: q.explanation,
      };
    });

    const st = stateRef.current;
    const resultPayload = {
      answers: enrichedAnswers,
      totalMarks,
      obtainedMarks,
      percentage,
      grade,
      passed,
      totalQuestions,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      answeredQuestions: answeredCount,
      unansweredQuestions: totalQuestions - answeredCount,
      flaggedQuestions: Array.from(answersRef.current.values()).filter((a) => a.flagged).length,
      timeUsed,
      timeLimit,
      classLevel: st?.classLevel,
      subject: st?.subject,
      assessmentType: st?.assessmentType,
      questions: qs,
      studentName: userRef.current?.name || 'Student',
      completedAt: new Date().toISOString(),
      abandoned: true,
    };

    const historyEntry = {
      classLevel: st?.classLevel,
      subject: st?.subject,
      assessmentType: st?.assessmentType,
      totalQuestions,
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      answeredQuestions: answeredCount,
      percentage,
      grade,
      passed,
      timeUsed,
      timestamp: Date.now(),
      completedAt: new Date().toISOString(),
      studentName: userRef.current?.name || 'Student',
      abandoned: true,
    };

    const existingHistory = JSON.parse(localStorage.getItem('assessment-history') || '[]');
    existingHistory.unshift(historyEntry);
    localStorage.setItem('assessment-history', JSON.stringify(existingHistory.slice(0, 50)));

    const apiPayload = {
      classLevel: st?.classLevel,
      subject: st?.subject,
      assessmentType: st?.assessmentType,
      totalQuestions,
      answeredQuestions: answeredCount,
      correctAnswers: correctCount,
      timeLimit,
      percentage,
      grade,
      passed,
      timeSpent: timeUsed,
      answers: enrichedAnswers,
      abandoned: true,
    };

    if (navigateAfter) {
      setIsAbandoning(true);
      setIsSubmitted(true);
      setShowLeaveModal(false);
      logAttemptEvent({ assessmentType: st?.assessmentType, eventType: 'submit', details: { abandoned: true } }).catch(() => {});
      saveAssessmentResult(apiPayload).catch(() => {});
      setTimeout(() => {
        navigate('/assessment/result', { state: resultPayload });
      }, 800);
    } else {
      saveAssessmentResultKeepalive(apiPayload).catch(() => {});
    }
  }, [navigate]);

  const handleAbandon = useCallback(() => {
    if (isSubmitted || isAbandoning) return;
    persistAbandonedAssessment(true);
  }, [isSubmitted, isAbandoning, persistAbandonedAssessment]);

  const recordAssessmentLeave = useCallback(() => {
    if (isSubmittedRef.current || isAbandoningRef.current || leaveRecordedRef.current) return;
    if (!questionsRef.current.length) return;
    persistAbandonedAssessment(false);
  }, [persistAbandonedAssessment]);

  // Record the score immediately if the student leaves mid-assessment without
  // submitting (tab close, refresh, or navigating away within the SPA).
  useEffect(() => {
    const onPageHide = () => {
      recordAssessmentLeave();
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      recordAssessmentLeave();
    };
  }, [recordAssessmentLeave]);

  const openReportModal = () => {
    setReportReason('');
    setReportNote('');
    setReportDone(false);
    setReportError(false);
    setShowReportModal(true);
  };

  const handleReportQuestion = async () => {
    if (!currentQuestion || !reportReason || reportBusy) return;
    setReportBusy(true);
    setReportError(false);
    try {
      await reportQuestion({
        questionId: currentQuestion.id,
        questionText: currentQuestion.question,
        subject: state?.subject || currentQuestion.subject || '',
        classLevel: state?.classLevel,
        assessmentType: state?.assessmentType,
        assessmentKey: storageKey,
        reason: reportReason,
        note: reportNote,
      });
      logAttemptEvent({ assessmentType: state?.assessmentType, eventType: 'question_reported' }).catch(() => {});
      setReportDone(true);
    } catch {
      setReportError(true);
    } finally {
      setReportBusy(false);
    }
  };

  useEffect(() => {
    if (isSubmitted) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, isSubmitted, handleSubmit]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeLeft <= 60) return 'text-rose-500';
    if (timeLeft <= 300) return 'text-amber-500';
    return 'text-slate-700 dark:text-slate-200';
  };

  const getTimerBg = () => {
    if (timeLeft <= 60) return 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800';
    if (timeLeft <= 300) return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800';
    return 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700';
  };

  const currentQuestion = questions[currentIndex];

  const getAnswer = (questionId: string): AssessmentAnswer => {
    return answers.get(questionId) || {
      questionId,
      selectedOption: null,
      flagged: false,
      timestamp: 0,
    };
  };

  const setAnswer = (questionId: string, option: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      const existing = next.get(questionId) || {
        questionId,
        selectedOption: null,
        flagged: false,
        timestamp: 0,
      };
      next.set(questionId, { ...existing, selectedOption: option, timestamp: Date.now() });
      return next;
    });
    logAttemptEvent({ assessmentType: state?.assessmentType, eventType: 'answer_change', questionId }).catch(() => {});
  };

  const toggleFlag = (questionId: string) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      const existing = next.get(questionId) || {
        questionId,
        selectedOption: null,
        flagged: false,
        timestamp: 0,
      };
      next.set(questionId, { ...existing, flagged: !existing.flagged });
      return next;
    });
    logAttemptEvent({ assessmentType: state?.assessmentType, eventType: 'flag', questionId }).catch(() => {});
  };

  const answeredCount = useMemo(() => {
    return Array.from(answers.values()).filter((a) => a.selectedOption !== null).length;
  }, [answers]);

  const flaggedCount = useMemo(() => {
    return Array.from(answers.values()).filter((a) => a.flagged).length;
  }, [answers]);

  const unansweredCount = questions.length - answeredCount;
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      setShowNavigator(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const goToNext = () => {
    if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const questionStatus = (index: number) => {
    const q = questions[index];
    if (!q) return 'unanswered';
    const answer = answers.get(q.id);
    if (answer?.selectedOption !== null) return 'answered';
    if (answer?.flagged) return 'flagged';
    return 'unanswered';
  };

  if (!state || !meta || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-slate-600 dark:text-slate-300 text-lg font-medium"
        >
          Submitting your assessment...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-8">
      {/* Timer Bar */}
      <div
        ref={timerRef}
        className={cn(
          'sticky top-0 z-50 border-b shadow-sm transition-colors duration-300',
          getTimerBg()
        )}
      >
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNavigator(true)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
              <div className="flex items-center gap-2">
                <Clock className={cn('w-5 h-5', getTimerColor())} />
                <span
                  className={cn(
                    'text-xl font-mono font-bold tracking-wider transition-colors duration-300',
                    getTimerColor(),
                    timeLeft <= 60 && 'animate-pulse'
                  )}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="hidden sm:flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">{answeredCount}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-slate-400 dark:text-slate-500">
                <XCircle className="w-4 h-4" />
                <span className="font-medium">{unansweredCount}</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 text-amber-500">
                <Flag className="w-4 h-4" />
                <span className="font-medium">{flaggedCount}</span>
              </div>
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors text-sm"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Submit</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-2 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {progressPercent}% completed
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
        <div className="flex gap-6">
          {/* Desktop Question Navigator */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-36">
              <motion.div
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-500" />
                  Question Navigator
                </h3>

                <div className="grid grid-cols-5 gap-2 mb-4">
                  {questions.map((_, index) => {
                    const status = questionStatus(index);
                    const isCurrent = index === currentIndex;
                    return (
                      <button
                        key={index}
                        onClick={() => goToQuestion(index)}
                        className={cn(
                          'relative w-10 h-10 rounded-xl text-sm font-medium transition-colors duration-200',
                          isCurrent && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                          status === 'answered' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white',
                          'hover:brightness-95 active:scale-95'
                        )}
                      >
                        {index + 1}
                        {status === 'flagged' && (
                          <Flag className="absolute -top-1 -right-1 w-3 h-3 text-amber-500 fill-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-emerald-500" />
                      <span className="text-slate-600 dark:text-slate-400">Answered</span>
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{answeredCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-rose-500" />
                      <span className="text-slate-600 dark:text-slate-400">Unanswered</span>
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{unansweredCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-slate-600 dark:text-slate-400">Flagged</span>
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{flaggedCount}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Question Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {currentQuestion && (
                <motion.div
                  key={currentQuestion.id}
                  variants={cardFlip}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-semibold">
                        Question {currentIndex + 1} of {questions.length}
                      </span>
                      <span className="hidden sm:inline px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium">
                        1 mark
                      </span>
                    </div>
                    <button
                      onClick={() => toggleFlag(currentQuestion.id)}
                      className={cn(
                        'p-2 rounded-xl transition-all duration-200',
                        getAnswer(currentQuestion.id).flagged
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'
                      )}
                    >
                      <Flag
                        className={cn(
                          'w-5 h-5',
                          getAnswer(currentQuestion.id).flagged && 'fill-current'
                        )}
                      />
                    </button>
                    <button
                      onClick={openReportModal}
                      className="flex h-10 w-10 items-center justify-center gap-1 rounded-xl text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-200 text-xs font-semibold sm:h-auto sm:w-auto sm:px-3 sm:py-2"
                      title="Report this question"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                      <span className="hidden sm:inline">Report</span>
                    </button>
                  </div>

                  {/* Question Text */}
                  <div className="px-6 py-6">
                    <p className="text-lg text-slate-800 dark:text-slate-100 leading-relaxed font-medium">
                      {currentQuestion.question}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="px-6 pb-6 space-y-3">
                    {currentQuestion.type === 'multiple-choice' && currentQuestion.options ? (
                      currentQuestion.options.map((option, optIndex) => {
                        const optionLabel = String.fromCharCode(65 + optIndex);
                        const isSelected = getAnswer(currentQuestion.id).selectedOption === optionLabel;
                        return (
                          <motion.button
                            key={optIndex}
                            onClick={() => setAnswer(currentQuestion.id, optionLabel)}
                            className={cn(
                              'w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all duration-200',
                              isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/50'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            )}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <span
                              className={cn(
                                'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-colors',
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              )}
                            >
                              {optionLabel}
                            </span>
                            <span
                              className={cn(
                                'flex-1 text-base',
                                isSelected
                                  ? 'text-blue-700 dark:text-blue-300 font-medium'
                                  : 'text-slate-700 dark:text-slate-300'
                              )}
                            >
                              {option}
                            </span>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </motion.div>
                            )}
                          </motion.button>
                        );
                      })
                    ) : (
                      <div className="flex gap-4">
                        {['True', 'False'].map((option) => {
                          const isSelected = getAnswer(currentQuestion.id).selectedOption === option;
                          return (
                            <motion.button
                              key={option}
                              onClick={() => setAnswer(currentQuestion.id, option)}
                              className={cn(
                                'flex-1 flex items-center justify-center gap-3 px-6 py-5 rounded-xl border-2 text-lg font-medium transition-all duration-200',
                                isSelected
                                  ? option === 'True'
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                                    : 'border-rose-500 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400'
                                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                              )}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {option === 'True' ? (
                                <CheckCircle2 className="w-6 h-6" />
                              ) : (
                                <XCircle className="w-6 h-6" />
                              )}
                              {option}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200',
                  currentIndex === 0
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                )}
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                {currentIndex + 1} / {questions.length}
              </span>

              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  <Send className="w-5 h-5" />
                  Submit Assessment
                </button>
              ) : (
                <button
                  onClick={goToNext}
                  className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  Save & Continue
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigator Overlay */}
      <AnimatePresence>
        {showNavigator && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowNavigator(false)}
            />
            <motion.div
              ref={navigatorRef}
              className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl p-6 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-blue-500" />
                  Navigator
                </h3>
                <button
                  onClick={() => setShowNavigator(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <XCircle className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {questions.map((_, index) => {
                  const status = questionStatus(index);
                  const isCurrent = index === currentIndex;
                  return (
                    <button
                      key={index}
                      onClick={() => goToQuestion(index)}
                      className={cn(
                        'relative w-10 h-10 rounded-xl text-sm font-medium transition-colors duration-200',
                        isCurrent && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
                        status === 'answered' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                      )}
                    >
                      {index + 1}
                      {status === 'flagged' && (
                        <Flag className="absolute -top-1 -right-1 w-3 h-3 text-amber-500 fill-amber-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-emerald-500" />
                    <span className="text-slate-600 dark:text-slate-400">Answered</span>
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{answeredCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-rose-500" />
                    <span className="text-slate-600 dark:text-slate-400">Unanswered</span>
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{unansweredCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Flag className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-slate-600 dark:text-slate-400">Flagged</span>
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{flaggedCount}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowSubmitModal(false)}
            />
            <motion.div
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              variants={bounceIn}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      Submit Assessment?
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Review your progress before submitting
                    </p>
                  </div>
                </div>

                <div className="space-y-3 my-6">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Answered
                      </span>
                    </div>
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      {answeredCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Unanswered
                      </span>
                    </div>
                    <span className="text-lg font-bold text-slate-600 dark:text-slate-300">
                      {unansweredCount}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
                    <div className="flex items-center gap-2">
                      <Flag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Flagged
                      </span>
                    </div>
                    <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                      {flaggedCount}
                    </span>
                  </div>
                </div>

                {unansweredCount > 0 && (
                  <motion.div
                    className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 mb-2"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      You have {unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''}.
                      These will be marked as incorrect.
                    </p>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    handleSubmit();
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Confirm Submit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT QUESTION MODAL */}
      <AnimatePresence>
        {showReportModal && currentQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowReportModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900 max-h-[90vh] overflow-y-auto"
            >
              {reportDone ? (
                <div className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">Question Reported</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Thanks for letting us know. Our team will review this question and correct it if needed.
                  </p>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="mt-6 w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
                  >
                    Back to Assessment
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Report a Question</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Your assessment continues — the timer keeps running.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 max-h-24 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-sm text-slate-600 dark:text-slate-300">{currentQuestion.question}</p>
                    </div>

                    <p className="mt-5 mb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Why are you reporting this?</p>
                    <div className="space-y-2">
                      {[
                        'The answer seems incorrect',
                        'The question is unclear or confusing',
                        'There is a typo or formatting issue',
                        "It doesn't match the subject or topic",
                        'Other',
                      ].map((reason) => (
                        <label
                          key={reason}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm cursor-pointer transition',
                            reportReason === reason
                              ? 'border-rose-400 bg-rose-50 dark:border-rose-500 dark:bg-rose-500/10 text-slate-800 dark:text-slate-200'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                          )}
                        >
                          <input
                            type="radio"
                            name="report-reason"
                            value={reason}
                            checked={reportReason === reason}
                            onChange={() => setReportReason(reason)}
                            className="sr-only"
                          />
                          <span className={cn('h-4 w-4 rounded-full border-2', reportReason === reason ? 'border-rose-500 bg-rose-500' : 'border-slate-300 dark:border-slate-600')} />
                          {reason}
                        </label>
                      ))}
                    </div>

                    <div className="mt-5">
                      <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Additional note (optional)</label>
                      <textarea
                        rows={3}
                        value={reportNote}
                        onChange={(e) => setReportNote(e.target.value)}
                        placeholder="Any extra detail that helps us investigate..."
                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    {reportError && (
                      <p className="mt-3 text-sm text-rose-500">
                        We couldn't submit your report. Please try again.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 px-6 pb-6">
                    <button
                      onClick={() => setShowReportModal(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReportQuestion}
                      disabled={!reportReason || reportBusy}
                      className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {reportBusy ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4" />
                          Submit Report
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEAVE WARNING MODAL */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowLeaveModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900 overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10">
                  <AlertTriangle className="h-8 w-8 text-rose-500" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                  Leave Assessment?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  You haven't submitted your answers yet. If you leave now, your assessment will be{' '}
                  <span className="font-bold text-rose-600 dark:text-rose-400">recorded as abandoned</span>{' '}
                  with a score of <span className="font-bold text-rose-600 dark:text-rose-400">0%</span>.
                </p>
                <div className="mt-4 rounded-xl bg-rose-50 p-4 dark:bg-rose-500/10">
                  <p className="text-sm font-medium text-rose-700 dark:text-rose-300">
                    This will affect your progress and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Stay
                </button>
                <button
                  onClick={handleAbandon}
                  disabled={isAbandoning}
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAbandoning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting 0...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Leave & Score 0
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
