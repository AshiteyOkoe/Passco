import { Router } from 'express';
import { initializePayment, verifyPayment, getPaymentHistory, getAllPayments, paystackWebhook } from '../controllers/paymentController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/initialize', authenticate, initializePayment);
router.get('/verify/:reference', authenticate, verifyPayment);
router.get('/history', authenticate, getPaymentHistory);
router.get('/admin/all', authenticate, requireAdmin, getAllPayments);
router.post('/webhook', paystackWebhook);

export default router;
