import { Router } from 'express';
import {
  createQuiz,
  getQuizzes,
  getQuizById,
  getQuizByDocumentId,
  submitQuiz,
  getResults,
  getResultById,
  assignQuiz,
  getStudentAnalytics,
} from '../controllers/quizController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', requireAdmin, createQuiz);
router.get('/', getQuizzes);
router.get('/analytics', getStudentAnalytics);
router.get('/by-document/:documentId', getQuizByDocumentId);
router.get('/:id', getQuizById);
router.post('/:id/submit', submitQuiz);
router.post('/:id/assign', requireAdmin, assignQuiz);

router.get('/results/all', getResults);
router.get('/results/:id', getResultById);

export default router;
