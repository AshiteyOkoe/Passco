import type { LucideIcon } from 'lucide-react';
import {
  Ruler,
  FlaskConical,
  BookOpen,
  Globe2,
  Monitor,
  HeartHandshake,
  Palette,
  Wrench,
  Library,
  GraduationCap,
  Trophy,
  ClipboardList,
  Award,
  Star,
} from 'lucide-react';

export interface BankQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false';
  options?: string[];
  correctAnswer: string | boolean;
  subject: string;
  explanation: string;
  difficulty?: DifficultyLevel;
}

export type JHSCategory = 'jhs1' | 'jhs2' | 'jhs3';
export type ClassLevel = JHSCategory;
export type AssessmentType = 'mock' | 'examination' | 'likely-bece';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'expert';
export type JHSSubjectId = 'mathematics' | 'science' | 'english' | 'social-studies' | 'ict' | 'rme' | 'creative-arts' | 'career-tech';
export type SubjectId = JHSSubjectId;

export interface AssessmentConfig {
  classLevel: ClassLevel;
  subject: SubjectId;
  assessmentType: AssessmentType;
}

export const SUBJECT_META: Record<SubjectId, { label: string; icon: LucideIcon; color: string }> = {
  mathematics: { label: 'Mathematics', icon: Ruler, color: 'blue' },
  science: { label: 'Science', icon: FlaskConical, color: 'emerald' },
  english: { label: 'English Language', icon: BookOpen, color: 'amber' },
  'social-studies': { label: 'Social Studies', icon: Globe2, color: 'violet' },
  ict: { label: 'ICT', icon: Monitor, color: 'cyan' },
  rme: { label: 'Religious and Moral Education', icon: HeartHandshake, color: 'purple' },
  'creative-arts': { label: 'Creative Arts and Design', icon: Palette, color: 'pink' },
  'career-tech': { label: 'Career Technology', icon: Wrench, color: 'orange' },
};

export const ASSESSMENT_META: Record<AssessmentType, { label: string; questionCount: number; timeLimit: number; description: string; icon: LucideIcon }> = {
  mock: { label: 'Mock Test', questionCount: 10, timeLimit: 420, description: 'Practice test with 10 questions and a 7-minute timer', icon: ClipboardList },
  examination: { label: 'Examination', questionCount: 20, timeLimit: 900, description: 'Examination with 20 questions under a 15-minute timer', icon: Award },
  'likely-bece': { label: 'Likely BECE', questionCount: 50, timeLimit: 3000, description: '50 likely BECE questions with a 50-minute countdown', icon: Star },
};

export const CLASS_META: Record<ClassLevel, { label: string; description: string; icon: LucideIcon }> = {
  jhs1: { label: 'JHS 1', description: 'Junior High School Form 1 — Building strong foundations in core subjects', icon: Library },
  jhs2: { label: 'JHS 2', description: 'Junior High School Form 2 — Intermediate level concepts and applications', icon: GraduationCap },
  jhs3: { label: 'JHS 3', description: 'Junior High School Form 3 — Advanced preparation for national exams', icon: Trophy },
};

export const DIFFICULTY_META: Record<DifficultyLevel, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: 'emerald' },
  intermediate: { label: 'Intermediate', color: 'amber' },
  expert: { label: 'Expert', color: 'rose' },
};

import { jhs1Questions } from './jhs1Questions';
import { jhs2Questions } from './jhs2Questions';
import { jhs3Questions } from './jhs3Questions';

const questionBank: Record<ClassLevel, BankQuestion[]> = {
  jhs1: jhs1Questions,
  jhs2: jhs2Questions,
  jhs3: jhs3Questions,
};

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getQuestions(classLevel: ClassLevel, count: number, subject?: string): BankQuestion[] {
  let bank = questionBank[classLevel] ?? [];
  if (subject) {
    const subjectLabel = SUBJECT_META[subject as SubjectId]?.label ?? subject;
    bank = bank.filter(q => q.subject.toLowerCase() === subjectLabel.toLowerCase());
  }
  return shuffleArray(bank).slice(0, Math.min(count, bank.length));
}

export function getSubjectQuestionCount(classLevel: ClassLevel, subject: string): number {
  const bank = questionBank[classLevel] ?? [];
  return bank.filter(q => q.subject === subject).length;
}

export function getSubjectsForClassLevel(_classLevel: ClassLevel): SubjectId[] {
  return ['mathematics', 'science', 'english', 'social-studies', 'ict', 'rme', 'creative-arts', 'career-tech'];
}

export function getSubjectIdFromLabel(label: string): SubjectId | undefined {
  return (Object.entries(SUBJECT_META) as [SubjectId, { label: string; icon: LucideIcon; color: string }][]).find(
    ([, meta]) => meta.label === label
  )?.[0];
}

const SUBJECT_LABEL_TO_KEY: Record<string, SubjectId> = {
  mathematics: 'mathematics', maths: 'mathematics',
  science: 'science',
  english: 'english', 'english language': 'english',
  'social studies': 'social-studies',
  ict: 'ict', 'information technology': 'ict',
  rme: 'rme', 'religious and moral education': 'rme', 'religious & moral education': 'rme',
  'creative arts': 'creative-arts', 'creative arts and design': 'creative-arts',
  'career technology': 'career-tech',
};

export function normalizeSubject(value?: string): SubjectId | undefined {
  if (!value) return undefined;
  const lower = value.trim().toLowerCase();
  if (lower in SUBJECT_META) return lower as SubjectId;
  return SUBJECT_LABEL_TO_KEY[lower];
}
