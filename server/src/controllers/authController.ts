import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';
import { generateToken } from '../middleware/auth';
import { AuthRequest } from '../types';
import fs from 'fs';
import path from 'path';

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

export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, role, institution, gradeLevel, dateOfBirth } = req.body;

    if (!dateOfBirth) {
      res.status(400).json({ message: 'Date of birth is required' });
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
        grade_level: gradeLevel || '',
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

    res.status(201).json({ token, user: userResponse(user as DbUser) });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = generateToken({
      id: user.id,
      role: user.role,
      email: user.email,
    });

    res.json({ token, user: userResponse(user as DbUser) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, institution, grade_level, avatar, gender, date_of_birth, class_level, created_at')
      .eq('id', req.user?.id)
      .single();

    if (error || !user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ ...userResponse(user as DbUser), createdAt: user.created_at });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, gender, dateOfBirth, institution, gradeLevel, classLevel, avatar } = req.body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (gender !== undefined) updates.gender = gender;
    if (dateOfBirth !== undefined) updates.date_of_birth = dateOfBirth ? new Date(dateOfBirth).toISOString() : null;
    if (institution !== undefined) updates.institution = institution;
    if (gradeLevel !== undefined) updates.grade_level = gradeLevel;
    if (classLevel !== undefined) updates.class_level = classLevel;
    if (avatar !== undefined) updates.avatar = avatar;

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user?.id)
      .select()
      .single();

    if (error || !user) {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }

    res.json({ user: userResponse(user as DbUser) });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
}

export async function uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const { data: user } = await supabase
      .from('users')
      .select('avatar')
      .eq('id', req.user?.id)
      .single();

    if (!user) {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }

    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;
    const { error } = await supabase
      .from('users')
      .update({ avatar: avatarPath, updated_at: new Date().toISOString() })
      .eq('id', req.user?.id);

    if (error) throw error;

    res.json({ avatar: avatarPath });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
}
