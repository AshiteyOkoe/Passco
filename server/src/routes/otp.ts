import { Router } from 'express';
import { sendOTP, verifyOTPAndRegister } from '../controllers/otpController';

const router = Router();

router.post('/send', sendOTP);
router.post('/verify', verifyOTPAndRegister);

export default router;
