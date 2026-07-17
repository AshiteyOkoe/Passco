import { Router } from 'express';
import {
  saveAssessmentResult,
  getMyAssessmentResults,
  getAllAssessmentResults,
  getAssessmentStats,
} from '../controllers/assessmentController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/results', authenticate, saveAssessmentResult);
router.get('/results/my', authenticate, getMyAssessmentResults);
router.get('/results', authenticate, requireAdmin, getAllAssessmentResults);
router.get('/stats', authenticate, requireAdmin, getAssessmentStats);

export default router;
