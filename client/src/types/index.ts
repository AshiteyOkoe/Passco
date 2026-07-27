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
  subject?: string;
  classLevel?: string;
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

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'basic' | 'premium';
  status: 'active' | 'cancelled' | 'expired' | 'past_due';
  amount: number;
  currency: string;
  payment_provider: string;
  payment_reference: string;
  starts_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount: number;
  currency: string;
  provider: string;
  provider_ref: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  plan: string;
  paid_at: string | null;
  created_at: string;
  userName?: string;
  userEmail?: string;
}

export interface AIUsageStatus {
  plan: string;
  used: number;
  limit: number;
  month: string;
}

export interface AIGeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  subject: string;
  type: 'multiple-choice' | 'true-false';
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  target_audience: 'all' | 'students' | 'admins';
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface PlanLimits {
  aiQuestions: number;
  label: string;
  quizzes: boolean;
  mocks: boolean;
  examinations: boolean;
  price: number;
}
