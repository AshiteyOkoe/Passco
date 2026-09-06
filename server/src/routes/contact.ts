import { Router } from 'express';
import {
  sendContactMessage,
  reportQuestion,
  getContactMessages,
  updateContactMessageStatus,
  getQuestionReports,
  updateQuestionReportStatus,
} from '../controllers/contactController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', sendContactMessage);
router.post('/report-question', reportQuestion);

router.get('/admin/messages', authenticate, requireAdmin, getContactMessages);
router.patch('/admin/messages/:id/status', authenticate, requireAdmin, updateContactMessageStatus);
router.get('/admin/question-reports', authenticate, requireAdmin, getQuestionReports);
router.patch('/admin/question-reports/:id/status', authenticate, requireAdmin, updateQuestionReportStatus);

export default router;