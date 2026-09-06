import { Router } from 'express';
import {
  createReportCard,
  getMyReportCards,
  getReportCard,
  deleteReportCard,
  verifyReport,
  getReportSettings,
} from '../controllers/reportCardController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/settings', authenticate, getReportSettings);
router.get('/my', authenticate, getMyReportCards);
router.post('/', authenticate, createReportCard);
router.get('/verify/:code', verifyReport);
router.get('/:id', authenticate, getReportCard);
router.delete('/:id', authenticate, deleteReportCard);

export default router;