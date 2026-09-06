import { Router } from 'express';
import { initializePayment, verifyPayment, getPaymentHistory, getAllPayments, paystackWebhook, getPaystackPublicKey } from '../controllers/paymentController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/public-key', getPaystackPublicKey);
router.post('/initialize', authenticate, initializePayment);
router.get('/verify/:reference', authenticate, verifyPayment);
router.get('/history', authenticate, getPaymentHistory);
router.get('/admin/all', authenticate, requireAdmin, getAllPayments);
router.post('/webhook', paystackWebhook);

export default router;
