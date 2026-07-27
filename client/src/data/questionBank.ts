export interface BankQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false';
  options?: string[];
  correctAnswer: string | boolean;
  subject: string;
  explanation: string;
}

export type JHSCategory = 'jhs1' | 'jhs2' | 'jhs3';
export type SHSCategory = 'shs1' | 'shs2' | 'shs3';
export type ClassLevel = JHSCategory | SHSCategory;
export type DifficultyLevel = 'beginner' | 'intermediate' | 'expert';
export type AssessmentType = 'quiz' | 'mock' | 'examination';
export type JHSSubjectId = 'mathematics' | 'science' | 'english' | 'social-studies' | 'ict' | 'rme' | 'creative-arts' | 'career-tech';
export type SHSSubjectId = 'core-mathematics' | 'core-english' | 'integrated-science' | 'social-studies-shs' | 'elective-mathematics' | 'biology' | 'chemistry' | 'physics' | 'business-management' | 'economics' | 'government' | 'history' | 'geography' | 'literature' | 'ict-shs';
export type SubjectId = JHSSubjectId | SHSSubjectId;

export interface AssessmentConfig {
  classLevel: ClassLevel;
  subject: SubjectId;
  difficulty: DifficultyLevel;
  assessmentType: AssessmentType;
}

export const SUBJECT_META: Record<SubjectId, { label: string; icon: string; color: string }> = {
  mathematics: { label: 'Mathematics', icon: '📐', color: 'blue' },
  science: { label: 'Science', icon: '🔬', color: 'emerald' },
  english: { label: 'English Language', icon: '📖', color: 'amber' },
  'social-studies': { label: 'Social Studies', icon: '🌍', color: 'violet' },
  ict: { label: 'ICT', icon: '💻', color: 'cyan' },
  rme: { label: 'Religious and Moral Education', icon: '🙏', color: 'purple' },
  'creative-arts': { label: 'Creative Arts and Design', icon: '🎨', color: 'pink' },
  'career-tech': { label: 'Career Technology', icon: '🔧', color: 'orange' },
  'core-mathematics': { label: 'Core Mathematics', icon: '📐', color: 'blue' },
  'core-english': { label: 'Core English', icon: '📖', color: 'amber' },
  'integrated-science': { label: 'Integrated Science', icon: '🔬', color: 'emerald' },
  'social-studies-shs': { label: 'Social Studies (SHS)', icon: '🌍', color: 'violet' },
  'elective-mathematics': { label: 'Elective Mathematics', icon: '🧮', color: 'indigo' },
  biology: { label: 'Biology', icon: '🧬', color: 'green' },
  chemistry: { label: 'Chemistry', icon: '⚗️', color: 'orange' },
  physics: { label: 'Physics', icon: '⚛️', color: 'sky' },
  'business-management': { label: 'Business Management', icon: '💼', color: 'slate' },
  economics: { label: 'Economics', icon: '📈', color: 'emerald' },
  government: { label: 'Government', icon: '🏛️', color: 'red' },
  history: { label: 'History', icon: '📜', color: 'amber' },
  geography: { label: 'Geography', icon: '🗺️', color: 'teal' },
  literature: { label: 'Literature in English', icon: '📚', color: 'purple' },
  'ict-shs': { label: 'ICT (SHS)', icon: '💻', color: 'cyan' },
};

export const ASSESSMENT_META: Record<AssessmentType, { label: string; questionCount: number; timeLimit: number; description: string; icon: string }> = {
  quiz: { label: 'Quiz', questionCount: 10, timeLimit: 420, description: 'Quick 10-question assessment to test your knowledge', icon: '⚡' },
  mock: { label: 'Mock Test', questionCount: 20, timeLimit: 900, description: 'Practice test with 20 questions and a timed environment', icon: '📝' },
  examination: { label: 'Examination', questionCount: 50, timeLimit: 3000, description: 'Full examination with 50 questions under strict timing', icon: '🎓' },
};

export const CLASS_META: Record<ClassLevel, { label: string; description: string; icon: string }> = {
  jhs1: { label: 'JHS 1', description: 'Junior High School Form 1 — Building strong foundations in core subjects', icon: '📚' },
  jhs2: { label: 'JHS 2', description: 'Junior High School Form 2 — Intermediate level concepts and applications', icon: '🎓' },
  jhs3: { label: 'JHS 3', description: 'Junior High School Form 3 — Advanced preparation for national exams', icon: '🏆' },
  shs1: { label: 'SHS 1', description: 'Senior High School Form 1 — Core and introductory elective subjects', icon: '📘' },
  shs2: { label: 'SHS 2', description: 'Senior High School Form 2 — Deeper elective subject mastery', icon: '📗' },
  shs3: { label: 'SHS 3', description: 'Senior High School Form 3 — Final preparation for WASSCE exams', icon: '📕' },
};

export const DIFFICULTY_META: Record<DifficultyLevel, { label: string; description: string; color: string }> = {
  beginner: { label: 'Beginner', description: 'Fundamental concepts and basic recall questions', color: 'emerald' },
  intermediate: { label: 'Intermediate', description: 'Applied knowledge and analytical thinking', color: 'amber' },
  expert: { label: 'Expert', description: 'Complex problem-solving and critical analysis', color: 'rose' },
};

import { jhs1Beginner, jhs1Intermediate, jhs1Expert } from './jhs1Questions';
import { jhs2Beginner, jhs2Intermediate, jhs2Expert } from './jhs2Questions';
import { jhs3Beginner, jhs3Intermediate, jhs3Expert } from './jhs3Questions';
import { shs1Beginner, shs1Intermediate, shs1Expert } from './shs1Questions';
import { shs2Beginner, shs2Intermediate, shs2Expert } from './shs2Questions';
import { shs3Beginner, shs3Intermediate, shs3Expert } from './shs3Questions';

const questionBank: Record<ClassLevel, Record<DifficultyLevel, BankQuestion[]>> = {
  jhs1: { beginner: jhs1Beginner, intermediate: jhs1Intermediate, expert: jhs1Expert },
  jhs2: { beginner: jhs2Beginner, intermediate: jhs2Intermediate, expert: jhs2Expert },
  jhs3: { beginner: jhs3Beginner, intermediate: jhs3Intermediate, expert: jhs3Expert },
  shs1: { beginner: shs1Beginner, intermediate: shs1Intermediate, expert: shs1Expert },
  shs2: { beginner: shs2Beginner, intermediate: shs2Intermediate, expert: shs2Expert },
  shs3: { beginner: shs3Beginner, intermediate: shs3Intermediate, expert: shs3Expert },
};

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getQuestions(classLevel: ClassLevel, difficulty: DifficultyLevel, count: number, subject?: string): BankQuestion[] {
  let bank = questionBank[classLevel]?.[difficulty] ?? [];
  if (subject) {
    const subjectLabel = SUBJECT_META[subject as SubjectId]?.label ?? subject;
    bank = bank.filter(q => q.subject.toLowerCase() === subjectLabel.toLowerCase());
  }
  return shuffleArray(bank).slice(0, Math.min(count, bank.length));
}

export function getSubjectQuestionCount(classLevel: ClassLevel, subject: string, difficulty?: DifficultyLevel): number {
  const difficulties: DifficultyLevel[] = difficulty ? [difficulty] : ['beginner', 'intermediate', 'expert'];
  let count = 0;
  for (const d of difficulties) {
    const bank = questionBank[classLevel]?.[d] ?? [];
    count += bank.filter(q => q.subject === subject).length;
  }
  return count;
}

export function isSHSClassLevel(classLevel: string): classLevel is SHSCategory {
  return ['shs1', 'shs2', 'shs3'].includes(classLevel);
}

export function getSubjectsForClassLevel(classLevel: ClassLevel): SubjectId[] {
  if (isSHSClassLevel(classLevel)) {
    return ['core-mathematics', 'core-english', 'integrated-science', 'social-studies-shs', 'elective-mathematics', 'biology', 'chemistry', 'physics', 'business-management', 'economics', 'government', 'history', 'geography', 'literature', 'ict-shs'];
  }
  return ['mathematics', 'science', 'english', 'social-studies', 'ict', 'rme', 'creative-arts', 'career-tech'];
}

export function getSubjectIdFromLabel(label: string): SubjectId | undefined {
  return (Object.entries(SUBJECT_META) as [SubjectId, { label: string; icon: string; color: string }][]).find(
    ([, meta]) => meta.label === label
  )?.[0];
}
