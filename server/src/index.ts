import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { connectDatabase } from './config/database';
import { seedUsers } from './seed';

import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import questionRoutes from './routes/questions';
import quizRoutes from './routes/quizzes';
import adminRoutes from './routes/admin';
import assessmentRoutes from './routes/assessment';
import bulkUploadRoutes from './routes/bulkUpload';
import subscriptionRoutes from './routes/subscriptions';
import paymentRoutes from './routes/payments';
import aiGenerationRoutes from './routes/aiGeneration';
import announcementRoutes from './routes/announcements';
import leaderboardRoutes from './routes/leaderboard';
import otpRoutes from './routes/otp';
import auditRoutes from './routes/audit';
import quizAttemptRoutes from './routes/quizAttempts';
import testimonialRoutes from './routes/testimonials';
import contactRoutes from './routes/contact';
import reportCardRoutes from './routes/reportCards';
import documentRequestRoutes from './routes/documentRequests';
import statsRoutes from './routes/stats';

console.log('dotenv loaded, GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY, 'prefix:', process.env.GEMINI_API_KEY?.substring(0, 8));

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];
if (process.env.CORS_ORIGIN) allowedOrigins.push(process.env.CORS_ORIGIN);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/bulk-upload', bulkUploadRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai-generation', aiGenerationRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/quiz-attempts', quizAttemptRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/report-cards', reportCardRoutes);
app.use('/api/document-requests', documentRequestRoutes);
app.use('/api/stats', statsRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function start() {
  await connectDatabase();
  await seedUsers();
  console.log(`Server running on http://localhost:${PORT}`);
  app.listen(PORT, () => {});
}

start();
