import { Router } from 'express';
import {
  createQuestion,
  generateQuestionsFromDocument,
  getQuestions,
  getApprovedQuestions,
  updateQuestion,
  deleteQuestion,
  approveQuestion,
  getQuestionCounts,
} from '../controllers/questionController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/counts', getQuestionCounts);

router.use(authenticate);

router.post('/', requireAdmin, createQuestion);
router.post('/generate', requireAdmin, generateQuestionsFromDocument);
router.get('/', getQuestions);
router.get('/approved', getApprovedQuestions);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);
router.put('/:id/approve', requireAdmin, approveQuestion);

export default router;
