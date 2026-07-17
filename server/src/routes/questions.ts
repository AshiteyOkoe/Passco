import { Router } from 'express';
import {
  createQuestion,
  generateQuestionsFromDocument,
  getQuestions,
  getApprovedQuestions,
  updateQuestion,
  deleteQuestion,
  approveQuestion,
} from '../controllers/questionController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', createQuestion);
router.post('/generate', generateQuestionsFromDocument);
router.get('/', getQuestions);
router.get('/approved', getApprovedQuestions);
router.put('/:id', updateQuestion);
router.delete('/:id', deleteQuestion);
router.put('/:id/approve', requireAdmin, approveQuestion);

export default router;
