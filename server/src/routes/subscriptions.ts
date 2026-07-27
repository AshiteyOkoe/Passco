import { Router } from 'express';
import { getMySubscription, getAllSubscriptions, suspendUser } from '../controllers/subscriptionController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/me', authenticate, getMySubscription);
router.get('/admin/all', authenticate, requireAdmin, getAllSubscriptions);
router.post('/admin/suspend/:id', authenticate, requireAdmin, suspendUser);

export default router;
