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
  phone?: string;
  username?: string;
  jobTitle?: string;
  department?: string;
  lastLogin?: string | null;
  timezone?: string;
  language?: string;
  preferences?: Record<string, unknown>;
  isActive?: boolean;
  hasPassword?: boolean;
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
  id?: string;
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

export interface PlatformStats {
  activeStudents: number;
  assessmentsTaken: number;
  questionsAnswered: number;
  averageScore: number;
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

export interface AdminCommandCenter {
  kpis: {
    students: { value: number; delta: number };
    results: { value: number; delta: number };
    questions: { value: number; delta: number };
    documents: { value: number; delta: number };
    pendingQuestions: number;
    activeSubscriptions: number;
    revenueThisMonth: number;
  };
  activity: Array<{ date: string; attempts: number; activeStudents: number }>;
  assessment: {
    total: number;
    avgScore: number;
    passRate: number;
    completionRate: number;
    avgTimeMin: number;
    series: Array<{ date: string; count: number }>;
  };
  subjects: Array<{ subject: string; students: number; attempts: number; avgScore: number; passRate: number }>;
  questionBank: Array<{ subject: string; count: number }>;
  pipeline: {
    total: number;
    processing: number;
    failed: number;
    ready: number;
    queued: number;
    items: Array<{ id: string; name: string; uploadedBy: string; status: string; questionsGenerated: number; createdAt: string }>;
  };
  subscriptionOverview: {
    active: number;
    expired: number;
    cancelled: number;
    newThisMonth: number;
    revenueThisMonth: number;
    revenueSeries: Array<{ month: string; total: number }>;
  };
  pendingActions: Array<{ id: string; label: string; count: number; to: string; severity: 'warning' | 'danger' | 'info' }>;
  recentActivity: Array<{ id: string; kind: string; actor: string; text: string; meta: string; time: string }>;
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
  correctAnswer: string | boolean;
  explanation: string;
  difficulty: string;
  subject: string;
  type: 'multiple-choice' | 'true-false';
  topic?: string;
  classLevel?: string;
  assessmentType?: string;
  fingerprint?: string;
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
  documentUploads: boolean;
  price: number;
}

export interface MySubscriptionResponse {
  subscription: Subscription;
  aiUsage: { used: number; limit: number; month: string };
  planLimits: PlanLimits;
  effectivePlan: 'free' | 'basic' | 'premium';
  isTrial: boolean;
  trialDays: number;
  trialDaysLeft: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  school: string;
  quote: string;
  rating: number;
  avatar_url: string;
  is_approved: boolean;
  created_at: string;
}

export interface InProgressAttempt {
  id: string;
  quizId: string;
  title: string;
  difficulty: string;
  timeRemaining: number;
  currentIndex: number;
  answersCount: number;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  account_type: string;
  subject: string;
  category: string;
  message: string;
  attachment?: string | null;
  attachment_name?: string;
  user_id?: string | null;
  status: 'new' | 'in_progress' | 'closed';
  ip_address?: string;
  created_at: string;
}

export interface QuestionReport {
  id: string;
  question_id: string;
  question_text: string;
  subject: string;
  class_level: string;
  assessment_type: string;
  assessment_key: string;
  user_id?: string | null;
  userName?: string;
  userEmail?: string;
  reason: string;
  note: string;
  status: 'new' | 'in_progress' | 'closed';
  ip_address?: string;
  created_at: string;
}

// ---- Academic Report Card ----
export interface ReportGradeRow {
  grade: string;
  min: number;
  max: number;
  remark: string;
}

export interface ReportBranding {
  reportTitle: string;
  subtitle: string;
  schoolName: string;
  directorName: string;
  directorTitle: string;
  footerNote: string;
}

export interface ReportThresholds {
  pass: number;
  improve: number;
  strength: number;
}

export interface ReportSettings {
  gradeConfig: ReportGradeRow[];
  thresholds: ReportThresholds;
  branding: ReportBranding;
}

export interface ReportCardRecord {
  id: string;
  userId: string;
  reportNumber: string;
  verificationCode: string;
  academicYear: string;
  term: string;
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  overallScore: number;
  overallGrade: string;
  overallRemark: string;
  status: 'current' | 'superseded' | 'void';
  dataSnapshot: Record<string, unknown>;
  profilePhotoSnapshotUrl: string;
  generatedAt: string;
  generatedBy: string;
  userName?: string;
  userEmail?: string;
}

export interface ReportVerifyResponse {
  found: boolean;
  reportNumber?: string;
  academicYear?: string;
  term?: string;
  overallGrade?: string;
  overallScore?: number;
  generatedAt?: string;
  studentNameMasked?: string;
}

export type DocumentRequestKind = 'report' | 'certificate';
export type DocumentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface DocumentRequestRecord {
  id: string;
  userId?: string;
  kind: DocumentRequestKind;
  academicYear: string;
  term: string;
  status: DocumentRequestStatus;
  adminNote: string;
  reportId: string | null;
  certificateCode: string;
  approvedBy: string | null;
  requestedAt: string;
  processedAt: string | null;
  studentName?: string;
  reportNumber?: string;
}

export interface EligibilityRequirement {
  key: string;
  label: string;
  target: number;
  current: number;
  met: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  requirements: EligibilityRequirement[];
}
