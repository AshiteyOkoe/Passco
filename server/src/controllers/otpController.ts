import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';
import { createOTP, verifyOTP, sendOTPEmail, emailConfigured } from '../utils/otp';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';
import { grantTrial } from '../services/subscriptionService';
import { resolveAvatarUrl } from '../utils/avatar';

interface DbUser {
  id: string;
  name: string;
  email: string;
  role: string;
  institution: string;
  grade_level: string;
  avatar: string;
  gender: string;
  date_of_birth: string | null;
  class_level: string;
  created_at: string;
}

function userResponse(user: DbUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    institution: user.institution,
    gradeLevel: user.grade_level,
    avatar: resolveAvatarUrl(user.avatar) || '',
    gender: user.gender || '',
    dateOfBirth: user.date_of_birth || null,
    classLevel: user.class_level || '',
  };
}

export async function sendOTP(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    const code = await createOTP(email);

    // SMTP unavailable: signal it to the client. The code is ONLY exposed in
    // non-production environments to keep local dev sign-ups working.
    if (!emailConfigured()) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Send OTP error: SMTP is not configured. To deliver verification codes, set SMTP_HOST/SMTP_USER/SMTP_PASS and a verified sender.');
        res.status(503).json({
          message: 'We could not send a verification email right now. Please check your email address and try again in a few minutes.',
          sent: false,
          configured: false,
        });
        return;
      }
      console.warn('[dev] SMTP not configured - returning code for local sign-up.');
      res.json({
        message: 'Email delivery is not configured in this environment, so your verification code is shown below.',
        sent: false,
        configured: false,
        code,
      });
      return;
    }

    const { sent, error } = await sendOTPEmail(email, code);

    if (sent) {
      res.json({ message: 'Verification code sent to your email', sent: true, configured: true });
      return;
    }

    // Delivery failed.
    if (process.env.NODE_ENV === 'production') {
      console.error('Send OTP error:', error);
      res.status(503).json({
        message: 'We could not send the verification email right now. The email address may be incorrect, or our mail service is temporarily unavailable. Please try again in a few minutes.',
        sent: false,
        configured: true,
      });
      return;
    }

    console.warn('[dev] SMTP send failed - returning code for local sign-up:', error);
    res.json({
      message: 'Email delivery temporarily failed in this environment, so your verification code is shown below.',
      sent: false,
      configured: true,
      code,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
}

export async function verifyOTPAndRegister(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, code, name, password, role, institution, gradeLevel, dateOfBirth, gender, classLevel } = req.body;

    if (!email || !code || !name || !password) {
      res.status(400).json({ message: 'Email, code, name, and password are required' });
      return;
    }

    if (!dateOfBirth) {
      res.status(400).json({ message: 'Date of birth is required' });
      return;
    }

    if (!(await verifyOTP(email, code))) {
      res.status(400).json({ message: 'Invalid or expired verification code' });
      return;
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        role: role || 'student',
        institution: institution || '',
        grade_level: gradeLevel || classLevel || '',
        gender: gender || null,
        class_level: classLevel || '',
        date_of_birth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    const token = generateToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    if (user.role === 'student') {
      await grantTrial(user.id);
    }

    res.status(201).json({ token, user: userResponse(user as DbUser) });
  } catch (error) {
    console.error('Verify OTP and register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
}
