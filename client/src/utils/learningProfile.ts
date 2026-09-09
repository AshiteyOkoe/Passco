import type { LucideIcon } from 'lucide-react';
import { SUBJECT_META, CLASS_META, type ClassLevel, type SubjectId } from '../data/questionBank';

export interface ProfileAssessment {
  classLevel: string;
  subject: string;
  assessmentType: string;
  percentage: number;
  grade: string;
  passed: boolean;
  timeSpent: number;
  timestamp: number;
  abandoned?: boolean;
}

export interface SubjectStat {
  subject: string;
  label: string;
  icon: LucideIcon;
  attempts: number;
  avgPct: number;
  bestPct: number;
  lastPct: number;
  trend: number;
  status: 'strength' | 'developing' | 'improve';
}

export interface ProfileStats {
  total: number;
  completed: number;
  abandoned: number;
  passedCount: number;
  passRate: number;
  avgScore: number;
  bestScore: number;
  totalTimeSpent: number;
  subjectsCovered: number;
  classesCovered: number;
  mocksTaken: number;
  examsTaken: number;
  perfectScores: number;
}

export interface BadgeSummary {
  id: string;
  name: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  earned: boolean;
  progress: number;
  maxProgress: number;
  earnedDate?: string;
}

const CURRENT_YEAR = new Date().getFullYear();

export function toSubjectKey(subject: string): SubjectId {
  const normalized = (subject || '').trim().toLowerCase();
  const direct = Object.keys(SUBJECT_META).find((k) => k === normalized || k.replace('-', ' ') === normalized.replace('-', ' '));
  if (direct) return direct as SubjectId;
  const byLabel = (Object.entries(SUBJECT_META) as [SubjectId, { label: string }][]).find(([, meta]) =>
    meta.label.toLowerCase() === normalized
  );
  if (byLabel) return byLabel[0];
  const fuzzy = (Object.entries(SUBJECT_META) as [SubjectId, { label: string }][]).find(([, meta]) =>
    meta.label.toLowerCase().includes(normalized) || normalized.includes(meta.label.toLowerCase().split(' ')[0])
  );
  return fuzzy ? fuzzy[0] : 'mathematics';
}

export function toClassKey(level: string): ClassLevel {
  const lvl = (level || '').trim().toLowerCase().replace(/\./g, '');
  if (lvl.includes('3') || lvl.includes('three')) return 'jhs3' as ClassLevel;
  if (lvl.includes('2') || lvl.includes('two')) return 'jhs2' as ClassLevel;
  return 'jhs1' as ClassLevel;
}

export function getClassLabel(level: string): string {
  const key = toClassKey(level);
  return CLASS_META[key].label;
}

export function getSubjectMeta(subject: string) {
  return SUBJECT_META[toSubjectKey(subject)];
}

export function getAssessmentTypeLabel(type: string): string {
  const t = (type || '').toLowerCase();
  if (t === 'mock' || t.includes('mock')) return 'Mock';
  if (t === 'examination' || t.includes('exam')) return 'Exam';
  if (t.includes('quiz')) return 'Quiz';
  if (t === 'practice' || t.includes('pract')) return 'Practice';
  return type || 'Assessment';
}

export function normalizeServerAssessments(server: unknown[]): ProfileAssessment[] {
  if (!Array.isArray(server)) return [];
  return server
    .filter((r) => r && typeof r === 'object' && !(r as { abandoned?: boolean }).abandoned)
    .map((r) => {
      const row = r as Record<string, unknown>;
      const completed = String(row.completed_at || row.created_at || '');
      return {
        classLevel: String(row.class_level || ''),
        subject: String(row.subject || ''),
        assessmentType: String(row.assessment_type || row.type || ''),
        percentage: Number(row.percentage || 0),
        grade: String(row.grade || ''),
        passed: Boolean(row.passed),
        timeSpent: Number(row.time_spent || 0),
        timestamp: completed ? new Date(completed).getTime() : Date.now(),
        abandoned: Boolean(row.abandoned),
      };
    });
}

export function getLocalAssessments(): ProfileAssessment[] {
  try {
    const raw = localStorage.getItem('assessment-history');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((r) => r && typeof r === 'object' && !r.abandoned)
      .map((r) => ({
        classLevel: String(r.classLevel || ''),
        subject: String(r.subject || ''),
        assessmentType: String(r.assessmentType || r.type || ''),
        percentage: Number(r.percentage || 0),
        grade: String(r.grade || ''),
        passed: Boolean(r.passed),
        timeSpent: Number(r.timeSpent || 0),
        timestamp: Number(r.timestamp || r.completedAt || Date.now()),
        abandoned: Boolean(r.abandoned),
      }));
  } catch {
    return [];
  }
}

export function mergeAssessments(server: unknown[], local: ProfileAssessment[]): ProfileAssessment[] {
  const seen = new Set<string>();
  const merged: ProfileAssessment[] = [];

  const keyFor = (a: ProfileAssessment) => {
    const date = new Date(a.timestamp).toISOString().slice(0, 10);
    return `${toSubjectKey(a.subject)}|${toClassKey(a.classLevel)}|${a.assessmentType.toLowerCase()}|${a.percentage}|${date}`;
  };

  [...normalizeServerAssessments(server), ...local].forEach((a) => {
    const k = keyFor(a);
    if (seen.has(k)) return;
    seen.add(k);
    merged.push(a);
  });

  return merged.sort((a, b) => b.timestamp - a.timestamp);
}

export function computeProfileStats(all: ProfileAssessment[]): ProfileStats {
  const completed = all.filter((a) => !a.abandoned);
  const passed = completed.filter((a) => a.passed);
  const subjects = new Set(completed.map((a) => toSubjectKey(a.subject)));
  const classes = new Set(completed.map((a) => toClassKey(a.classLevel)));
  const avg = completed.length > 0 ? Math.round(completed.reduce((s, a) => s + a.percentage, 0) / completed.length) : 0;

  return {
    total: completed.length,
    completed: completed.length,
    abandoned: all.length - completed.length,
    passedCount: passed.length,
    passRate: completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0,
    avgScore: avg,
    bestScore: completed.length > 0 ? Math.max(...completed.map((a) => a.percentage)) : 0,
    totalTimeSpent: completed.reduce((s, a) => s + (a.timeSpent || 0), 0),
    subjectsCovered: subjects.size,
    classesCovered: classes.size,
    mocksTaken: completed.filter((a) => a.assessmentType.toLowerCase().includes('mock')).length,
    examsTaken: completed.filter((a) => a.assessmentType.toLowerCase().includes('exam')).length,
    perfectScores: completed.filter((a) => a.percentage === 100).length,
  };
}

export function computeSubjectBreakdown(all: ProfileAssessment[]): SubjectStat[] {
  const completed = all.filter((a) => !a.abandoned);
  const bySubject = new Map<string, ProfileAssessment[]>();
  completed.forEach((a) => {
    const key = toSubjectKey(a.subject);
    const list = bySubject.get(key) || [];
    list.push(a);
    bySubject.set(key, list);
  });

  return Array.from(bySubject.entries())
    .map(([key, list]) => {
      const sorted = [...list].sort((a, b) => a.timestamp - b.timestamp);
      const avg = list.reduce((s, a) => s + a.percentage, 0) / list.length;
      const recent = sorted.slice(-3).reduce((s, a) => s + a.percentage, 0) / Math.max(1, sorted.slice(-3).length);
      const older = sorted.slice(0, -3).reduce((s, a) => s + a.percentage, 0) / Math.max(1, sorted.slice(0, -3).length);
      const trend = sorted.length > 3 ? recent - older : 0;
      const status: SubjectStat['status'] = avg >= 75 ? 'strength' : avg >= 50 ? 'developing' : 'improve';
      const sub = SUBJECT_META[key as SubjectId];
      return {
        subject: key,
        label: sub.label,
        icon: sub.icon,
        attempts: list.length,
        avgPct: Math.round(avg),
        bestPct: Math.max(...list.map((a) => a.percentage)),
        lastPct: sorted[sorted.length - 1].percentage,
        trend: Math.round(trend),
        status,
      };
    })
    .sort((a, b) => b.avgPct - a.avgPct);
}

export function filterByRange(all: ProfileAssessment[], days: number): ProfileAssessment[] {
  if (days <= 0) return all;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return all.filter((a) => a.timestamp >= cutoff);
}

export function buildTimeSeries(all: ProfileAssessment[], runner: { cumulative: boolean } = { cumulative: false }): Array<{ label: string; pct: number }> {
  const sorted = [...all].sort((a, b) => a.timestamp - b.timestamp);
  if (!runner.cumulative) {
    return sorted.map((a) => ({
      label: new Date(a.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      pct: a.percentage,
    }));
  }
  const series: Array<{ label: string; pct: number }> = [];
  let acc: number[] = [];
  sorted.forEach((a) => {
    acc.push(a.percentage);
    const avg = Math.round(acc.reduce((s, v) => s + v, 0) / acc.length);
    series.push({ label: new Date(a.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), pct: avg });
  });
  return series;
}

export function buildSubjectChart(all: ProfileAssessment[]): Array<{ subject: string; avg: number }> {
  return computeSubjectBreakdown(all).map((s) => ({ subject: s.label, avg: s.avgPct }));
}

export function computeStreaks(all: ProfileAssessment[], gapMs = 7 * 24 * 60 * 60 * 1000): { current: number; best: number } {
  const sorted = [...all].sort((a, b) => a.timestamp - b.timestamp);
  let current = 0;
  let best = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || sorted[i].timestamp - sorted[i - 1].timestamp <= gapMs) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return { current, best };
}

export function buildActivityDays(all: ProfileAssessment[], weeks = 13): { days: Map<string, number>; min: string; max: string } {
  const days = new Map<string, number>();
  all.forEach((a) => {
    const key = new Date(a.timestamp).toISOString().slice(0, 10);
    days.set(key, (days.get(key) || 0) + 1);
  });
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (weeks * 7 - 1));
  return { days, min: start.toISOString().slice(0, 10), max: today.toISOString().slice(0, 10) };
}

function badgeBase(earned: boolean, progress: number, maxProgress: number, tier: BadgeSummary['tier'], earnedDate?: string): BadgeSummary {
  return { id: '', name: '', tier, earned, progress: Math.min(progress, maxProgress), maxProgress, earnedDate };
}

export function computeBadgeSummary(all: ProfileAssessment[]): { stats: ProfileStats; totalBadges: number; earnedCount: number; badges: BadgeSummary[] } {
  const stats = computeProfileStats(all);
  const completed = all.filter((a) => !a.abandoned && a.passed);
  const badges: BadgeSummary[] = [];

  (['jhs1', 'jhs2', 'jhs3'] as ClassLevel[]).forEach((cls) => {
    const count = completed.filter((a) => toClassKey(a.classLevel) === cls).length;
    const hasPassed = count > 0;
    const first = completed.find((a) => toClassKey(a.classLevel) === cls);
    badges.push({
      ...badgeBase(hasPassed, count, 5, hasPassed ? 'gold' : 'bronze', hasPassed ? new Date(first!.timestamp).toISOString() : undefined),
      id: `class-${cls}`,
      name: `${CLASS_META[cls].label} Graduate`,
    });
  });

  (Object.keys(SUBJECT_META) as SubjectId[]).forEach((sub) => {
    const count = completed.filter((a) => toSubjectKey(a.subject) === sub).length;
    const earned = count >= 2;
    const gold = earned && stats.avgScore >= 80;
    badges.push({
      ...badgeBase(earned, count, 2, gold ? 'gold' : earned ? 'silver' : 'bronze'),
      id: `subject-${sub}`,
      name: `${SUBJECT_META[sub].label} Champion`,
    });
  });

  const mockDone = stats.mocksTaken;
  badges.push({ ...badgeBase(mockDone >= 3, mockDone, 3, mockDone >= 3 ? 'gold' : mockDone >= 1 ? 'silver' : 'bronze'), id: 'mock-3', name: 'Mock Master' });

  const examDone = stats.examsTaken;
  badges.push({ ...badgeBase(examDone >= 2, examDone, 2, examDone >= 2 ? 'gold' : examDone >= 1 ? 'silver' : 'bronze'), id: 'exam-2', name: 'Exam Warrior' });

  const highAvg = stats.avgScore >= 80;
  badges.push({ ...badgeBase(highAvg, stats.avgScore, 80, stats.avgScore >= 90 ? 'platinum' : highAvg ? 'gold' : 'bronze'), id: 'score-80', name: 'High Achiever' });

  badges.push({ ...badgeBase(stats.perfectScores > 0, stats.perfectScores > 0 ? 1 : 0, 1, 'diamond'), id: 'perfect', name: 'Perfectionist' });

  const { best } = computeStreaks(completed);
  badges.push({ ...badgeBase(best >= 3, best, 3, best >= 3 ? 'silver' : 'bronze'), id: 'streak-3', name: 'Consistent Learner' });

  const allClassesDone = stats.classesCovered >= 3;
  const allSubjectsDone = stats.subjectsCovered >= (Object.keys(SUBJECT_META).length);
  const masteryEarned = allClassesDone && allSubjectsDone && stats.avgScore >= 80;
  badges.push({
    ...badgeBase(
      masteryEarned,
      stats.classesCovered + stats.subjectsCovered + (stats.avgScore >= 80 ? 1 : 0),
      Object.keys(SUBJECT_META).length + 3 + 1,
      'diamond'
    ),
    id: 'mastery-grand',
    name: 'Grand Master',
  });

  const totalBadges = badges.length;
  const earnedCount = badges.filter((b) => b.earned).length;
  return { stats, totalBadges, earnedCount, badges };
}

export function isEligibleForCertificate(all: ProfileAssessment[]): boolean {
  const stats = computeProfileStats(all);
  return stats.avgScore >= 70 && stats.completed >= 20;
}