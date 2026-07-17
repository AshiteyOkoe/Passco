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
} from '../types';

const api = axios.create({
  baseURL: '/api',
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
  gradeLevel?: string;
  dateOfBirth: string;
}): Promise<AuthResponse> {
  const res = await api.post('/auth/register', data);
  return res.data;
}

export async function login(data: { email: string; password: string }): Promise<AuthResponse> {
  const res = await api.post('/auth/login', data);
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
