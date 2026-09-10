import { Router, Request, Response, NextFunction } from 'express';
import { sendOTP, verifyOTPAndRegister } from '../controllers/otpController';

const router = Router();

// Lightweight in-memory throttle for OTP sends (no external deps).
const MS_MINUTE = 60 * 1000;
const perIpWindow = new Map<string, { count: number; reset: number }>();
const lastSendByEmail = new Map<string, number>();

const PER_IP_MAX = 10; // sends per IP per hour
const PER_IP_WINDOW_MS = 60 * MS_MINUTE;
const EMAIL_RESEND_MIN_MS = 60 * 1000;

function rateLimitOTP(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase() : '';

  const now = Date.now();

  if (perIpWindow.size > 2000) {
    perIpWindow.forEach((entry, key) => {
      if (entry.reset < now) perIpWindow.delete(key);
    });
  }

  // Per-IP hourly cap.
  const ipEntry = perIpWindow.get(ip);
  if (!ipEntry || ipEntry.reset < now) {
    perIpWindow.set(ip, { count: 1, reset: now + PER_IP_WINDOW_MS });
  } else {
    ipEntry.count++;
    if (ipEntry.count > PER_IP_MAX) {
      res.status(429).json({ message: 'Too many verification codes requested from this network. Please try again later.' });
      return;
    }
  }

  // Per-email cooldown.
  if (email) {
    const last = lastSendByEmail.get(email) || 0;
    if (now - last < EMAIL_RESEND_MIN_MS) {
      res.status(429).json({ message: 'A verification code was recently sent. Please wait a minute before requesting another.' });
      return;
    }
    lastSendByEmail.set(email, now);
    if (lastSendByEmail.size > 2000) {
      lastSendByEmail.forEach((ts, k) => {
        if (now - ts > 24 * 3600 * 1000) lastSendByEmail.delete(k);
      });
    }
  }

  next();
}

router.post('/send', rateLimitOTP, sendOTP);
router.post('/verify', verifyOTPAndRegister);

export default router;