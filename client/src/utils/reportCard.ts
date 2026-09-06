import { SUBJECT_META, CLASS_META, type SubjectId } from '../data/questionBank';
import {
  toSubjectKey,
  toClassKey,
  computeStreaks,
  computeBadgeSummary,
} from './learningProfile';
import { isCustomAvatar, resolveUploadUrl } from '../services/api';
import type { ReportGradeRow, ReportThresholds } from '../types';

export const TERMS = ['First Term', 'Second Term', 'Third Term', 'Full Year'] as const;
export type ReportTerm = (typeof TERMS)[number];

export interface ReportOptions {
  subjectPerformance: boolean;
  topicPerformance: boolean;
  performanceTrend: boolean;
  assessmentStatistics: boolean;
  achievements: boolean;
  strengths: boolean;
  improvements: boolean;
  recommendations: boolean;
  verificationQr: boolean;
  teacherRemark: boolean;
  profilePhoto: boolean;
}

export const DEFAULT_REPORT_OPTIONS: ReportOptions = {
  subjectPerformance: true,
  topicPerformance: false,
  performanceTrend: true,
  assessmentStatistics: true,
  achievements: true,
  strengths: true,
  improvements: true,
  recommendations: true,
  verificationQr: true,
  teacherRemark: true,
  profilePhoto: true,
};

export interface ReportAssessment {
  subject: string;
  subjectKey: SubjectId;
  classLevel: string;
  assessmentType: string;
  questionsAttempted: number;
  answeredQuestions: number;
  correctAnswers: number;
  percentage: number;
  grade: string;
  passed: boolean;
  timeSpent: number;
  timestamp: number;
}

export interface ReportSubjectRow {
  subjectKey: SubjectId;
  label: string;
  assessments: number;
  questions: number;
  correct: number;
  score: number;
  grade: string;
  remark: string;
}

export interface ReportData {
  meta: {
    academicYearLabel: string;
    term: ReportTerm;
    periodLabel: string;
    periodStart: string;
    periodEnd: string;
    dateIssued: string;
    reportNumber: string;
    verificationCode: string;
    options: ReportOptions;
  };
  student: {
    name: string;
    studentId: string;
    classLabel: string;
    school: string;
  };
  summary: {
    overallScore: number;
    averageScore: number;
    assessmentsTaken: number;
    questionsAttempted: number;
    correctAnswers: number;
    accuracy: number;
    avgCompletionMin: number;
    bestScore: number;
  };
  subjects: ReportSubjectRow[];
  grading: ReportGradeRow[];
  trend: Array<{ label: string; pct: number }>;
  stats: {
    completed: number;
    quizzes: number;
    mocks: number;
    exams: number;
    questionsAttempted: number;
    correct: number;
    incorrect: number;
    avg: number;
    highest: number;
    lowest: number;
    avgCompletionMin: number;
  };
  strengths: Array<{ subjectKey: SubjectId; label: string; avg: number }>;
  improvements: Array<{ subjectKey: SubjectId; label: string; avg: number; level: 'developing' | 'needs' }>;
  habits: {
    studySessions: number;
    learningDays: number;
    currentStreak: number;
    longestStreak: number;
    questionsAnswered: number;
    practiceSessions: number;
    weeklyPracticeAvg: number;
  };
  achievements: string[];
  remark: {
    text: string;
    teacherName: string;
    teacherTitle: string;
    isSystem: boolean;
  };
  recommendations: string[];
  overall: {
    score: number;
    grade: string;
    remark: string;
    status: string;
  };
}

const SUBJECT_ORDER: SubjectId[] = [
  'mathematics',
  'english',
  'science',
  'social-studies',
  'ict',
  'rme',
  'creative-arts',
  'career-tech',
];

const PAGE_WIDTH_PX = 794;

export function pageWidthPx(): number {
  return PAGE_WIDTH_PX;
}

// ---------- Assessment parsing & merging ----------

function normalizeServer(r: unknown): ReportAssessment | null {
  if (!r || typeof r !== 'object') return null;
  const row = r as Record<string, unknown>;
  if (Boolean(row.abandoned)) return null;
  const ts = new Date(String(row.completed_at || row.created_at || '')).getTime();
  const answered = Number(row.answered_questions ?? row.total_questions ?? 0);
  return {
    subject: String(row.subject || ''),
    subjectKey: toSubjectKey(String(row.subject || '')),
    classLevel: toClassKey(String(row.class_level || '')),
    assessmentType: String(row.assessment_type || row.type || ''),
    questionsAttempted: Number(row.total_questions ?? answered),
    answeredQuestions: answered,
    correctAnswers: Number(row.correct_answers || 0),
    percentage: Number(row.percentage || 0),
    grade: String(row.grade || ''),
    passed: Boolean(row.passed),
    timeSpent: Number(row.time_spent || 0),
    timestamp: Number.isFinite(ts) && ts > 0 ? ts : Date.now(),
  };
}

function normalizeLocal(r: unknown): ReportAssessment | null {
  if (!r || typeof r !== 'object') return null;
  const row = r as Record<string, unknown>;
  if (Boolean(row.abandoned)) return null;
  const answered = Number(row.answeredQuestions ?? row.totalQuestions ?? 0);
  return {
    subject: String(row.subject || ''),
    subjectKey: toSubjectKey(String(row.subject || '')),
    classLevel: toClassKey(String(row.classLevel || '')),
    assessmentType: String(row.assessmentType || row.type || ''),
    questionsAttempted: Number(row.totalQuestions ?? answered),
    answeredQuestions: answered,
    correctAnswers: Number(row.correctCount ?? row.correctAnswers ?? 0),
    percentage: Number(row.percentage || 0),
    grade: String(row.grade || ''),
    passed: Boolean(row.passed),
    timeSpent: Number(row.timeSpent || 0),
    timestamp: Number(row.timestamp || row.completedAt || Date.now()),
  };
}

export function parseAssessments(serverResults: unknown[], localHistory: unknown[]): ReportAssessment[] {
  const seen = new Set<string>();
  const out: ReportAssessment[] = [];
  const add = (a: ReportAssessment | null) => {
    if (!a) return;
    const key = `${a.subjectKey}|${a.classLevel}|${a.assessmentType.toLowerCase()}|${a.percentage}|${new Date(a.timestamp).toISOString().slice(0, 10)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(a);
  };
  (Array.isArray(serverResults) ? serverResults : []).forEach((r) => add(normalizeServer(r)));
  (Array.isArray(localHistory) ? localHistory : []).forEach((r) => add(normalizeLocal(r)));
  return out.sort((a, b) => a.timestamp - b.timestamp);
}

// ---------- Periods ----------

export function academicYearOf(ts: number): number {
  const d = new Date(ts);
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}

export function listAcademicYears(list: ReportAssessment[]): number[] {
  const set = new Set<number>();
  list.forEach((a) => set.add(academicYearOf(a.timestamp)));
  set.add(academicYearOf(Date.now()));
  return Array.from(set).sort((a, b) => b - a);
}

export function termRange(year: number, term: ReportTerm): { start: number; end: number } {
  if (term === 'Full Year') {
    return {
      start: new Date(year, 8, 1).getTime(),
      end: new Date(year + 1, 8, 1).getTime() - 1,
    };
  }
  if (term === 'First Term') {
    return {
      start: new Date(year, 8, 1).getTime(),
      end: new Date(year, 11, 31, 23, 59, 59, 999).getTime(),
    };
  }
  if (term === 'Second Term') {
    return {
      start: new Date(year + 1, 0, 1).getTime(),
      end: new Date(year, 3, 30, 23, 59, 59, 999).getTime(),
    };
  }
  return {
    start: new Date(year + 1, 4, 1).getTime(),
    end: new Date(year + 1, 7, 31, 23, 59, 59, 999).getTime(),
  };
}

export function filterByPeriod(list: ReportAssessment[], year: number, term: ReportTerm): ReportAssessment[] {
  const range = termRange(year, term);
  return list.filter((a) => a.timestamp >= range.start && a.timestamp <= range.end);
}

export function periodLabelFor(year: number, term: ReportTerm): string {
  const range = termRange(year, term);
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${term} · ${fmt(range.start)} \u2013 ${fmt(range.end)}`;
}

export function academicYearLabel(year: number): string {
  return `${year}/${year + 1}`;
}

// ---------- Grading ----------

export function sortGradeConfig(config: ReportGradeRow[]): ReportGradeRow[] {
  return [...config].sort((a, b) => b.min - a.min);
}

export function gradeFor(pct: number, config: ReportGradeRow[]): ReportGradeRow {
  const sorted = sortGradeConfig(config);
  for (const row of sorted) {
    if (pct >= row.min) return row;
  }
  return sorted[sorted.length - 1] || { grade: 'F', min: 0, max: 49, remark: 'Unsatisfactory' };
}

export function defaultGradeConfig(): ReportGradeRow[] {
  return [
    { grade: 'A+', min: 90, max: 100, remark: 'Excellent' },
    { grade: 'A', min: 80, max: 89, remark: 'Very Good' },
    { grade: 'B', min: 70, max: 79, remark: 'Good' },
    { grade: 'C', min: 60, max: 69, remark: 'Satisfactory' },
    { grade: 'D', min: 50, max: 59, remark: 'Needs Improvement' },
    { grade: 'F', min: 0, max: 49, remark: 'Unsatisfactory' },
  ];
}

export function defaultThresholds(): ReportThresholds {
  return { pass: 50, improve: 60, strength: 75 };
}

export function deriveStudentId(userId: string): string {
  const hex = (userId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
  return `PASSCO-${hex || '000000'}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---------- System remark ----------

export function systemRemark(overallScore: number, grade: string, config: ReportGradeRow[]): string {
  const score = overallScore;
  const count = config.length;
  const topQuota = Math.max(1, Math.round(count * 0.34));
  const topGrades = sortGradeConfig(config).slice(0, topQuota).map((g) => g.grade);

  if (score >= 90) {
    return 'This student has demonstrated outstanding academic performance and strong understanding across subjects. Maintain this excellent standard by continuing regular practice and attempting higher-difficulty assessments.';
  }
  if (score >= 80) {
    return 'This student has shown very good academic performance throughout the reporting period. Continued practice on core subjects will help sustain and strengthen this result.';
  }
  if (score >= 70) {
    return 'This student has performed well and demonstrated solid understanding in most subjects. Focused practice on the areas listed below will help raise the overall grade.';
  }
  if (score >= 60) {
    return 'This student has shown satisfactory performance with good effort. Regular revision and additional practice questions are recommended to strengthen weaker topics.';
  }
  if (score >= 50) {
    return 'This student is making progress and should be encouraged to keep practising. Consistent daily study and revisiting difficult topics will improve performance.';
  }
  return 'This student requires additional support and consistent practice to build confidence and understanding. Following the recommended next steps will help steady improvement.';
}

// ---------- Photo snapshot ----------

export async function resolvePhotoDataUrl(avatar?: string): Promise<string | null> {
  if (!isCustomAvatar(avatar)) return null;
  try {
    const res = await fetch(resolveUploadUrl(avatar || ''));
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const targetW = 180;
    const targetH = 240;
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scale = Math.max(targetW / bitmap.width, targetH / bitmap.height);
    const sw = (bitmap.width * scale).toFixed(0);
    const sh = (bitmap.height * scale).toFixed(0);
    const dw = Math.min(bitmap.width, targetW);
    const dh = Math.min(bitmap.height, targetH);
    const sx = Math.max(0, (Number(sw) - targetW) / 2);
    const sy = Math.max(0, (Number(sh) - targetH) / 2);

    ctx.drawImage(bitmap, sx, sy, dw, dh, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
}

// ---------- Main builder ----------

export function buildReportData(opts: {
  user: { id: string; name: string; institution?: string; classLevel?: string; gradeLevel?: string };
  assessments: ReportAssessment[];
  year: number;
  term: ReportTerm;
  gradeConfig: ReportGradeRow[];
  thresholds: ReportThresholds;
  reportNumber: string;
  verificationCode: string;
  dateIssued?: number;
  options: ReportOptions;
  teacherRemark?: string;
  teacherName?: string;
  teacherTitle?: string;
}): ReportData {
  const list = filterByPeriod(opts.assessments, opts.year, opts.term);
  const completed = list.filter((a) => a.answeredQuestions > 0 || a.percentage > 0);

  const range = termRange(opts.year, opts.term);
  const issued = opts.dateIssued || Date.now();

  const avgPct =
    completed.length > 0 ? completed.reduce((s, a) => s + a.percentage, 0) / completed.length : 0;
  const overallScore = Math.round(avgPct);
  const gradeRow = gradeFor(avgPct, opts.gradeConfig);
  const overallRemark = gradeRow.remark;
  const status = avgPct >= (opts.thresholds.pass || 50) ? 'PASS' : 'REVIEW REQUIRED';

  // Summary
  const questionsAttempted = completed.reduce((s, a) => s + (a.questionsAttempted || 0), 0);
  const answeredQuestions = completed.reduce((s, a) => s + a.answeredQuestions, 0);
  const correctAnswers = completed.reduce((s, a) => s + a.correctAnswers, 0);
  const totalTime = completed.reduce((s, a) => s + (a.timeSpent || 0), 0);
  const accuracy = answeredQuestions > 0 ? Math.round((correctAnswers / answeredQuestions) * 100) : 0;
  const bestScore = completed.length > 0 ? Math.max(...completed.map((a) => a.percentage)) : 0;
  const lowestScore = completed.length > 0 ? Math.min(...completed.map((a) => a.percentage)) : 0;

  // Subject rows (present only, deterministic order)
  const bySubject = new Map<SubjectId, ReportAssessment[]>();
  completed.forEach((a) => {
    const key = a.subjectKey;
    const listFor = bySubject.get(key) || [];
    listFor.push(a);
    bySubject.set(key, listFor);
  });
  const subjects: ReportSubjectRow[] = SUBJECT_ORDER.filter((key) => bySubject.has(key)).map((key) => {
    const rows = bySubject.get(key)!;
    const score = rows.reduce((s, a) => s + a.percentage, 0) / rows.length;
    const subGrade = gradeFor(score, opts.gradeConfig);
    return {
      subjectKey: key,
      label: SUBJECT_META[key].label,
      assessments: rows.length,
      questions: rows.reduce((s, a) => s + a.answeredQuestions, 0),
      correct: rows.reduce((s, a) => s + a.correctAnswers, 0),
      score: Math.round(score),
      grade: subGrade.grade,
      remark: subGrade.remark,
    };
  });

  // Trend
  const sorted = [...completed].sort((a, b) => a.timestamp - b.timestamp);
  let acc = 0;
  let accCount = 0;
  const trend = sorted.map((a) => {
    acc += a.percentage;
    accCount += 1;
    return {
      label: new Date(a.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      pct: Math.round(acc / accCount),
    };
  });

  // Stats by type
  const quizzes = completed.filter((a) => {
    const t = a.assessmentType.toLowerCase();
    return !t.includes('mock') && !t.includes('exam') && (t.includes('quiz') || t.includes('practice') || t === 'assessment');
  }).length;
  const mocks = completed.filter((a) => a.assessmentType.toLowerCase().includes('mock')).length;
  const exams = completed.filter((a) => a.assessmentType.toLowerCase().includes('exam')).length;

  const stats = {
    completed: completed.length,
    quizzes,
    mocks,
    exams,
    questionsAttempted: questionsAttempted || answeredQuestions,
    correct: correctAnswers,
    incorrect: answeredQuestions - correctAnswers,
    avg: Math.round(avgPct),
    highest: bestScore,
    lowest: lowestScore,
    avgCompletionMin: completed.length > 0 ? round1(totalTime / completed.length / 60) : 0,
  };

  // Strengths & improvements
  const strengthThreshold = opts.thresholds.strength || 75;
  const improveThreshold = opts.thresholds.improve || 60;
  const strengths = subjects
    .filter((s) => s.score >= strengthThreshold)
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ subjectKey: s.subjectKey, label: s.label, avg: s.score }));
  const improvements = subjects
    .filter((s) => s.score < improveThreshold)
    .sort((a, b) => a.score - b.score)
    .map((s) => ({
      subjectKey: s.subjectKey,
      label: s.label,
      avg: s.score,
      level: (s.score >= 50 ? 'developing' : 'needs') as 'developing' | 'needs',
    }));

  // Habits
  const learningDays = new Set(completed.map((a) => new Date(a.timestamp).toISOString().slice(0, 10))).size;
  const streaks = computeStreaks(completed);
  const firstTs = sorted[0]?.timestamp || Date.now();
  const weeks = Math.max(1, Math.ceil((Date.now() - firstTs) / (7 * 24 * 60 * 60 * 1000)));
  const habits = {
    studySessions: completed.length,
    learningDays,
    currentStreak: streaks.current,
    longestStreak: streaks.best,
    questionsAnswered: answeredQuestions,
    practiceSessions: completed.filter((a) => {
      const t = a.assessmentType.toLowerCase();
      return t.includes('practice') || t.includes('quiz');
    }).length,
    weeklyPracticeAvg: round1(completed.length / weeks),
  };

  // Achievements
  const badgeProfile = completed.map((a) => ({
    classLevel: a.classLevel,
    subject: a.subject,
    assessmentType: a.assessmentType,
    percentage: a.percentage,
    grade: a.grade,
    passed: a.passed,
    timeSpent: a.timeSpent,
    timestamp: a.timestamp,
    abandoned: false,
  }));
  const badgeInfo = computeBadgeSummary(badgeProfile);
  const achievements = badgeInfo.badges.filter((b) => b.earned).map((b) => b.name).slice(0, 10);

  // Remark
  const hasCustomRemark = !!(opts.teacherRemark && opts.teacherRemark.trim());
  const remark = {
    text: hasCustomRemark ? opts.teacherRemark!.trim() : systemRemark(overallScore, gradeRow.grade, opts.gradeConfig),
    teacherName: hasCustomRemark ? opts.teacherName || '' : '',
    teacherTitle: hasCustomRemark ? opts.teacherTitle || 'Teacher' : '',
    isSystem: !hasCustomRemark,
  };

  // Recommendations
  const recs: string[] = [];
  improvements.forEach((im) => {
    recs.push(
      im.level === 'needs'
        ? `Review ${im.label} topics and complete additional practice questions before your next assessment.`
        : `Practise ${im.label} for at least 20 minutes daily to strengthen your understanding.`
    );
  });
  const math = subjects.find((s) => s.subjectKey === 'mathematics');
  if (math && math.score < 70 && !recs.some((r) => r.includes('Mathematics'))) {
    recs.push('Spend extra time on Mathematics - focus on the topics that were scored lowest.');
  }
  if (mocks < 3 && stats.completed >= 3) {
    recs.push('Attempt at least 3 mock examinations to build examination confidence and time management.');
  }
  if (streaks.current > 0) {
    recs.push('Maintain your current learning streak - consistency beats intensity.');
  } else if (streaks.best > 0) {
    recs.push('Keep up the consistent practice - your long-term streak is a great habit to restart.');
  }
  if (overallScore >= 80) {
    recs.push('Excellent work! Consider attempting higher-difficulty assessments to stretch your knowledge.');
  }
  if (recs.length === 0) {
    recs.push('Complete at least one assessment in each subject each week to keep building a healthy learning routine.');
  }

  return {
    meta: {
      academicYearLabel: academicYearLabel(opts.year),
      term: opts.term,
      periodLabel: periodLabelFor(opts.year, opts.term),
      periodStart: new Date(range.start).toISOString(),
      periodEnd: new Date(range.end).toISOString(),
      dateIssued: new Date(issued).toISOString(),
      reportNumber: opts.reportNumber,
      verificationCode: opts.verificationCode,
      options: opts.options,
    },
    student: {
      name: opts.user.name || 'PASSCO Student',
      studentId: deriveStudentId(opts.user.id),
      classLabel: opts.user.classLevel
        ? CLASS_META[toClassKey(opts.user.classLevel)].label
        : opts.user.gradeLevel
          ? String(opts.user.gradeLevel)
          : 'Not set',
      school: opts.user.institution || '',
    },
    summary: {
      overallScore,
      averageScore: round1(avgPct),
      assessmentsTaken: completed.length,
      questionsAttempted: questionsAttempted || answeredQuestions,
      correctAnswers,
      accuracy,
      avgCompletionMin: stats.avgCompletionMin,
      bestScore,
    },
    subjects,
    grading: sortGradeConfig(opts.gradeConfig),
    trend,
    stats,
    strengths,
    improvements,
    habits,
    achievements,
    remark,
    recommendations: recs.slice(0, 6),
    overall: { score: overallScore, grade: gradeRow.grade, remark: overallRemark, status },
  };
}

export function restoreReportData(snapshot: Record<string, unknown>): ReportData {
  return snapshot as unknown as ReportData;
}