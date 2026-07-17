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

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'], credentials: true }));
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

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

async function start() {
  await connectDatabase();
  await seedUsers();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
