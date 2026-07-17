import { Router } from 'express';
import {
  getDashboardStats,
  getStudents,
  getFullAnalytics,
  getStudentDetail,
  deleteStudent,
  getStudentResults,
  getAllQuizzes,
  getAllDocuments,
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/students/:id/results', getStudentResults);
router.get('/students/:id', getStudentDetail);
router.delete('/students/:id', deleteStudent);
router.get('/quizzes', getAllQuizzes);
router.get('/documents', getAllDocuments);

router.get('/dashboard', getDashboardStats);
router.get('/students', getStudents);
router.get('/analytics', getFullAnalytics);

export default router;
