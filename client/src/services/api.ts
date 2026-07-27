import axios, { AxiosError } from 'axios';
import type {
  AuthResponse,
  User,
  UploadedDocument,
  Question,
  Quiz,
  QuizAnswer,
  Result,
  StudentStats,
  AdminStats,
  Subscription,
  Payment,
  AIUsageStatus,
  AIGeneratedQuestion,
  Announcement,
  PlanLimits,
} from '../types';

const API_BASE = import.meta.env.DEV ? '/api' : '/api';
const UPLOADS_BASE = import.meta.env.DEV ? '' : '';

export function resolveUploadUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith('http')) return path;
  return path;
}

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('passco-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('passco-token');
      localStorage.removeItem('passco-user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export async function register(data: {
  name: string;
  email: string;
  password: string;
  role?: string;
  institution?: string;
  dateOfBirth: string;
  gender?: string;
  classLevel?: string;
}): Promise<AuthResponse> {
  const res = await api.post('/auth/register', data);
  return res.data;
}

export async function login(data: { email: string; password: string }): Promise<AuthResponse> {
  const res = await api.post('/auth/login', data);
  return res.data;
}

export async function sendOTP(email: string): Promise<{ message: string }> {
  const res = await api.post('/otp/send', { email });
  return res.data;
}

export async function verifyOTPAndRegister(data: {
  email: string;
  code: string;
  name: string;
  password: string;
  role?: string;
  institution?: string;
  dateOfBirth: string;
  gender?: string;
  classLevel?: string;
}): Promise<AuthResponse> {
  const res = await api.post('/otp/verify', data);
  return res.data;
}

export async function getProfile(): Promise<User> {
  const res = await api.get('/auth/profile');
  return res.data;
}

export async function updateProfile(data: Partial<User>): Promise<{ user: User }> {
  const res = await api.put('/auth/profile', data);
  return res.data;
}

export async function uploadAvatar(file: File): Promise<{ avatar: string }> {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await api.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function uploadFile(file: File): Promise<{ document: UploadedDocument }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function processFile(documentId: string): Promise<UploadedDocument> {
  const res = await api.post(`/files/${documentId}/process`);
  return res.data;
}

export async function getDocuments(): Promise<{ documents: UploadedDocument[] }> {
  const res = await api.get('/files');
  return res.data;
}

export async function getDocumentById(id: string): Promise<UploadedDocument> {
  const res = await api.get(`/files/${id}`);
  return res.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/files/${id}`);
}

export async function generateQuestions(data: {
  documentId: string;
  difficulty: string;
  count?: number;
}): Promise<{ questions: Question[]; quizId: string }> {
  const res = await api.post('/questions/generate', data);
  return res.data;
}

export async function getQuestions(params?: {
  documentId?: string;
  topic?: string;
  difficulty?: string;
  subject?: string;
  classLevel?: string;
}): Promise<{ questions: Question[] }> {
  const res = await api.get('/questions', { params });
  return res.data;
}

export async function getApprovedBankQuestions(params?: {
  subject?: string;
  classLevel?: string;
  difficulty?: string;
  type?: string;
}): Promise<{ questions: Array<{
  id: string;
  question: string;
  type: string;
  options?: string[];
  correctAnswer: string | boolean;
  explanation: string;
  difficulty: string;
  subject: string;
  classLevel: string;
  topic: string;
}> }> {
  const res = await api.get('/questions/approved', { params });
  return res.data;
}

export async function createQuestion(data: {
  documentId: string;
  question: string;
  type: string;
  options?: string[];
  correctAnswer: string | boolean;
  explanation?: string;
  difficulty?: string;
  topic?: string;
  subject?: string;
  classLevel?: string;
}): Promise<void> {
  await api.post('/questions', data);
}

export async function updateQuestion(id: string, data: Partial<Question>): Promise<void> {
  await api.put(`/questions/${id}`, data);
}

export async function deleteQuestion(id: string): Promise<void> {
  await api.delete(`/questions/${id}`);
}

export async function approveQuestion(id: string): Promise<void> {
  await api.put(`/questions/${id}/approve`);
}

export async function createQuiz(data: {
  title: string;
  description?: string;
  documentId?: string;
  questions: string[];
  difficulty: string;
  timeLimit?: number;
  assignedTo?: string[];
}): Promise<{ quiz: Quiz }> {
  const res = await api.post('/quizzes', data);
  return res.data;
}

export async function getQuizzes(): Promise<{ quizzes: Quiz[] }> {
  const res = await api.get('/quizzes');
  return res.data;
}

export async function getQuizById(id: string): Promise<{ quiz: Quiz }> {
  const res = await api.get(`/quizzes/${id}`);
  return res.data;
}

export async function getQuizByDocumentId(documentId: string): Promise<{ quiz: Quiz }> {
  const res = await api.get(`/quizzes/by-document/${documentId}`);
  return res.data;
}

export async function submitQuiz(
  id: string,
  data: { answers: QuizAnswer[]; timeTaken: number }
): Promise<{ result: Result }> {
  const res = await api.post(`/quizzes/${id}/submit`, data);
  return res.data;
}

export async function assignQuiz(id: string, userIds: string[]): Promise<void> {
  await api.post(`/quizzes/${id}/assign`, { userIds });
}

export async function getResults(): Promise<{ results: Result[] }> {
  const res = await api.get('/quizzes/results/all');
  return res.data;
}

export async function getResultById(id: string): Promise<{ result: Result }> {
  const res = await api.get(`/quizzes/results/${id}`);
  return res.data;
}

export async function getStudentAnalytics(): Promise<StudentStats> {
  const res = await api.get('/quizzes/analytics');
  return res.data;
}

export async function getAdminDashboard(): Promise<AdminStats> {
  const res = await api.get('/admin/dashboard');
  return res.data;
}

export async function getStudents(): Promise<{
  students: Array<{
    id: string;
    name: string;
    email: string;
    institution?: string;
    gradeLevel?: string;
    avatar?: string;
    gender?: string;
    quizzesTaken: number;
    avgScore: number;
    documentsUploaded: number;
    createdAt: string;
  }>;
}> {
  const res = await api.get('/admin/students');
  return res.data;
}

export async function getAdminStudentDetail(studentId: string): Promise<{
  student: {
    id: string;
    name: string;
    email: string;
    institution?: string;
    gradeLevel?: string;
    createdAt: string;
  };
  results: Array<{
    _id: string;
    quizId: string | { _id: string; title: string };
    score: number;
    totalQuestions: number;
    correctCount: number;
    completedAt: string;
  }>;
  documents: Array<{
    id: string;
    originalName: string;
    fileSize: number;
    status: string;
    createdAt: string;
  }>;
  stats: {
    totalQuizzes: number;
    averageScore: number;
    totalDocuments: number;
  };
}> {
  const res = await api.get(`/admin/students/${studentId}`);
  return res.data;
}

export async function deleteAdminStudent(id: string): Promise<void> {
  await api.delete(`/admin/students/${id}`);
}

export async function getAdminStudentResults(id: string): Promise<any> {
  const res = await api.get(`/admin/students/${id}/results`);
  return res.data;
}

export async function getAdminAllQuizzes(): Promise<any> {
  const res = await api.get('/admin/quizzes');
  return res.data;
}

export async function getAdminAllDocuments(): Promise<any> {
  const res = await api.get('/admin/documents');
  return res.data;
}

export async function getAdminAnalytics(): Promise<{
  totalQuizzes: number;
  averageScore: number;
  scoreDistribution: Array<{ _id: string; count: number }>;
  resultsByDay: Array<{ date: string; count: number; avgScore: number }>;
}> {
  const res = await api.get('/admin/analytics');
  return res.data;
}

export async function getAdminSubjectCounts(): Promise<{ counts: Record<string, number> }> {
  const res = await api.get('/admin/subject-counts');
  return res.data;
}

// Subscription API
export async function getMySubscription(): Promise<{
  subscription: Subscription;
  aiUsage: { used: number; limit: number; month: string };
  planLimits: PlanLimits;
}> {
  const res = await api.get('/subscriptions/me');
  return res.data;
}

export async function getAllSubscriptions(): Promise<{ subscriptions: Array<Subscription & { userName: string; userEmail: string }> }> {
  const res = await api.get('/subscriptions/admin/all');
  return res.data;
}

export async function suspendUserSubscription(userId: string): Promise<void> {
  await api.post(`/subscriptions/admin/suspend/${userId}`);
}

// Payment API
export async function initializePayment(data: { plan: string; email: string }): Promise<{
  authorization_url: string;
  reference: string;
  access_code: string;
}> {
  const res = await api.post('/payments/initialize', data);
  return res.data;
}

export async function verifyPayment(reference: string): Promise<{ message: string; plan: string }> {
  const res = await api.get(`/payments/verify/${reference}`);
  return res.data;
}

export async function getPaymentHistory(): Promise<{ payments: Payment[] }> {
  const res = await api.get('/payments/history');
  return res.data;
}

export async function getAllPayments(): Promise<{ payments: Payment[]; totalRevenue: number }> {
  const res = await api.get('/payments/admin/all');
  return res.data;
}

// AI Generation API
export async function getAIGenerationStatus(): Promise<AIUsageStatus & { limit: number }> {
  const res = await api.get('/ai-generation/status');
  return res.data;
}

export async function generateQuestionsAI(data: {
  text: string;
  subject: string;
  difficulty?: string;
  count?: number;
}): Promise<{ questions: AIGeneratedQuestion[]; usage: { used: number; limit: number; remaining: number; month: string } }> {
  const res = await api.post('/ai-generation/generate', data);
  return res.data;
}

export async function saveAIGeneratedQuestions(data: {
  questions: AIGeneratedQuestion[];
  documentId?: string;
}): Promise<{ message: string; count: number; documentId: string }> {
  const res = await api.post('/ai-generation/save', data);
  return res.data;
}

export async function getAIUsageStats(): Promise<{
  totalGenerated: number;
  activeUsers: number;
  monthlyBreakdown: Array<{ user_id: string; month: string; questions_generated: number }>;
}> {
  const res = await api.get('/ai-generation/admin/usage');
  return res.data;
}

// Announcement API
export async function getAnnouncements(): Promise<{ announcements: Announcement[] }> {
  const res = await api.get('/announcements');
  return res.data;
}

export async function getAllAnnouncements(): Promise<{ announcements: Announcement[] }> {
  const res = await api.get('/announcements/admin/all');
  return res.data;
}

export async function createAnnouncement(data: {
  title: string;
  body: string;
  priority?: string;
  targetAudience?: string;
}): Promise<{ announcement: Announcement }> {
  const res = await api.post('/announcements', data);
  return res.data;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  institution: string;
  classLevel: string;
  avatar: string;
  gender: string;
  avg: number;
  total: number;
  badges: number;
  scores: number[];
  joinedAt: string;
}

export async function getLeaderboard(): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const res = await api.get('/leaderboard');
  return res.data;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await api.delete(`/announcements/${id}`);
}

// Assessment Results API
export async function saveAssessmentResult(result: Record<string, unknown>) {
  const res = await api.post('/assessment/results', result);
  return res.data;
}

export async function getMyAssessmentResults() {
  const res = await api.get('/assessment/results/my');
  return res.data;
}

export async function getAllAssessmentResults(params?: { classLevel?: string; subject?: string; difficulty?: string; page?: number }) {
  const res = await api.get('/assessment/results', { params });
  return res.data;
}

export async function getAssessmentStats() {
  const res = await api.get('/assessment/stats');
  return res.data;
}

export default api;
