import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getEligibility,
  createDocumentRequest,
  getMyDocumentRequests,
  cancelDocumentRequest,
} from '../controllers/documentRequestController';

const router = Router();

router.use(authenticate);

router.get('/eligibility', getEligibility);
router.post('/', createDocumentRequest);
router.get('/my', getMyDocumentRequests);
router.post('/:id/cancel', cancelDocumentRequest);

export default router;