import { Router } from 'express';
import { getAIGenerationStatus, generateQuestionsFromAI, saveAIGeneratedQuestions, getAIUsageStats } from '../controllers/aiGenerationController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/status', authenticate, getAIGenerationStatus);
router.post('/generate', authenticate, generateQuestionsFromAI);
router.post('/save', authenticate, saveAIGeneratedQuestions);
router.get('/admin/usage', authenticate, requireAdmin, getAIUsageStats);

export default router;
