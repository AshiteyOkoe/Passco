import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';
import { createOTP, verifyOTP, sendOTPEmail } from '../utils/otp';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';

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
    avatar: user.avatar || '',
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

    const code = createOTP(email);
    await sendOTPEmail(email, code);

    res.json({ message: 'Verification code sent to your email' });
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

    if (!verifyOTP(email, code)) {
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
        date_of_birth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
      })
      .select()
      .single();

    if (error) throw error;

    const optionalUpdates: Record<string, unknown> = {};
    if (gender) optionalUpdates.gender = gender;
    if (classLevel) optionalUpdates.class_level = classLevel;
    if (Object.keys(optionalUpdates).length > 0) {
      await supabase.from('users').update(optionalUpdates).eq('id', user.id);
    }

    const token = generateToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    res.status(201).json({ token, user: userResponse(user as DbUser) });
  } catch (error) {
    console.error('Verify OTP and register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
}
