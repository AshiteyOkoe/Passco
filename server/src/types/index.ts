import { Request } from 'express';

export type UserRole = 'student' | 'admin';
export type QuestionType = 'multiple-choice' | 'true-false';
export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    email: string;
  };
}

export interface QuestionData {
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | boolean;
  explanation: string;
  difficulty: Difficulty;
  topic: string;
}

export interface QuizAnswer {
  questionId: string;
  answer: string | boolean | null;
  flagged: boolean;
}

export interface FileParseResult {
  text: string;
  topics: string[];
}
