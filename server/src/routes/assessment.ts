import { Router } from 'express';
import {
  saveAssessmentResult,
  getMyAssessmentResults,
  getAllAssessmentResults,
  getAdminAssessmentResultsByUser,
  getAssessmentStats,
  getBeceEligibility,
} from '../controllers/assessmentController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/bece-eligibility', authenticate, getBeceEligibility);
router.post('/results', authenticate, saveAssessmentResult);
router.get('/results/my', authenticate, getMyAssessmentResults);
router.get('/results/admin/user/:userId', authenticate, requireAdmin, getAdminAssessmentResultsByUser);
router.get('/results', authenticate, requireAdmin, getAllAssessmentResults);
router.get('/stats', authenticate, requireAdmin, getAssessmentStats);

export default router;
