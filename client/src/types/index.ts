export type UserRole = 'student' | 'admin';
export type QuestionType = 'multiple-choice' | 'true-false';
export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export interface AssessmentAnswer {
  questionId: string;
  answer: string | boolean | null;
  flagged: boolean;
}

export interface AssessmentResult {
  id: string;
  studentName: string;
  classLevel: string;
  difficulty: string;
  assessmentType: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
  grade: string;
  passed: boolean;
  timeUsed: number;
  timeLimit: number;
  abandoned?: boolean;
  answers: Array<{
    questionId: string;
    question: string;
    type: string;
    options?: string[];
    userAnswer: string | boolean | null;
    correctAnswer: string | boolean;
    isCorrect: boolean;
    subject: string;
    explanation: string;
  }>;
  completedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution?: string;
  gradeLevel?: string;
  avatar?: string;
  gender?: 'male' | 'female' | '';
  dateOfBirth?: string | null;
  classLevel?: string;
  createdAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UploadedDocument {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  extractedText?: string;
  topics: string[];
  status: 'processing' | 'ready' | 'failed';
  uploadedBy?: string;
  createdAt: string;
}

export interface Question {
  _id: string;
  documentId: string;
  question: string;
  type: QuestionType;
  options?: string[];
  correctAnswer: string | boolean;
  explanation: string;
  difficulty: Difficulty;
  topic: string;
  approved: boolean;
  createdAt: string;
}

export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  documentId?: string;
  createdBy: string;
  questions: Question[];
  difficulty: Difficulty;
  timeLimit: number;
  isActive: boolean;
  assignedTo: string[];
  createdAt: string;
}

export interface QuizAnswer {
  questionId: string;
  answer: string | boolean | null;
  flagged: boolean;
}

export interface Result {
  _id: string;
  userId: string;
  quizId: string | { _id: string; title: string; difficulty: string };
  answers: AnswerDetail[];
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  timeTaken: number;
  completedAt: string;
}

export interface AnswerDetail {
  questionId: string;
  userAnswer: string | boolean | null;
  correctAnswer: string | boolean;
  isCorrect: boolean;
  timeSpent: number;
}

export interface StudentStats {
  totalQuizzes: number;
  averageScore: number;
  totalCorrect: number;
  totalQuestions: number;
  recentResults: Array<{
    id: string;
    score: number;
    totalQuestions: number;
    correctCount: number;
    completedAt: string;
  }>;
  scoreHistory: Array<{ date: string; score: number }>;
  weakTopics: Array<{ topic: string; score: number; total: number }>;
}

export interface AdminStats {
  stats: {
    totalStudents: number;
    totalDocuments: number;
    totalQuestions: number;
    pendingQuestions: number;
    totalQuizzes: number;
    totalResults: number;
  };
  recentDocuments: Array<{
    id: string;
    name: string;
    uploadedBy: string;
    status: string;
    createdAt: string;
  }>;
  recentResults: Array<{
    id: string;
    studentName: string;
    quizTitle: string;
    score: number;
    completedAt: string;
  }>;
}
