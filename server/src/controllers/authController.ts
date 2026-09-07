import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabase';
import { generateToken } from '../middleware/auth';
import { AuthRequest } from '../types';
import { grantTrial } from '../services/subscriptionService';
import { logAuditEvent } from '../services/auditService';
import { resolveAvatarUrl } from '../utils/avatar';
import crypto from 'crypto';
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
  phone?: string;
  username?: string;
  job_title?: string;
  department?: string;
  last_login?: string | null;
  timezone?: string;
  language?: string;
  preferences?: Record<string, unknown>;
  is_active?: boolean;
  token_version?: number;
  password_hash?: string;
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
    phone: user.phone || '',
    username: user.username || '',
    jobTitle: user.job_title || '',
    department: user.department || '',
    lastLogin: user.last_login || null,
    timezone: user.timezone || '',
    language: user.language || 'English',
    preferences: user.preferences || {},
    isActive: user.is_active ?? true,
    hasPassword: !!user.password_hash,
  };
}

function clientIp(req: AuthRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.ip || '';
}

export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, role, institution, gradeLevel, dateOfBirth, gender, classLevel } = req.body;

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
      .maybeSingle();

    if (error || !user) {
      await logAuditEvent({
        action: 'login_failed',
        entityType: 'auth',
        entityId: email,
        ipAddress: clientIp(req),
        details: { reason: 'unknown_email' },
      });
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash || '');
    if (!isMatch) {
      await logAuditEvent({
        userId: user.id,
        action: 'login_failed',
        entityType: 'auth',
        entityId: user.id,
        ipAddress: clientIp(req),
        details: { reason: 'invalid_password' },
      });
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    if (user.is_active === false) {
      res.status(403).json({ message: 'This account has been deactivated. Contact your administrator.' });
      return;
    }

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', user.id);

    const token = generateToken(
      { id: user.id, role: user.role, email: user.email },
      user.token_version || 0
    );

    await logAuditEvent({
      userId: user.id,
      action: 'login',
      entityType: 'auth',
      entityId: user.id,
      ipAddress: clientIp(req),
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
      .select('*')
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
    const { name, phone, username, jobTitle, department, timezone, language, preferences, avatar } = req.body;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof phone === 'string') updates.phone = phone;
    if (typeof jobTitle === 'string') updates.job_title = jobTitle;
    if (typeof department === 'string') updates.department = department;
    if (typeof timezone === 'string') updates.timezone = timezone;
    if (typeof language === 'string') updates.language = language;

    if (username !== undefined) {
      const uname = String(username).trim();
      if (uname) {
        const { data: conflict } = await supabase
          .from('users')
          .select('id')
          .eq('username', uname)
          .maybeSingle();
        if (conflict && conflict.id !== req.user?.id) {
          res.status(400).json({ message: 'Username is already taken' });
          return;
        }
      }
      updates.username = uname || null;
    }

    if (preferences && typeof preferences === 'object') {
      const { data: existing } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', req.user?.id)
        .single();
      updates.preferences = { ...(existing?.preferences || {}), ...preferences };
    }

    if (avatar === '') updates.avatar = '';

    const { data: user, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user?.id)
      .select()
      .maybeSingle();

    if (error || !user) {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }

    await logAuditEvent({
      userId: req.user?.id,
      action: 'profile_updated',
      entityType: 'user',
      entityId: req.user?.id,
      ipAddress: clientIp(req),
      details: { fields: Object.keys(updates).filter((k) => k !== 'updated_at') },
    });

    res.json({ user: { ...userResponse(user as DbUser), createdAt: user.created_at } });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current and new password are both required' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters long' });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user?.id)
      .single();

    if (error || !user) {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }

    if (!user.password_hash) {
      res.status(400).json({ message: 'This account uses Google sign-in and has no password set.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await supabase
      .from('users')
      .update({ password_hash: hashed, updated_at: new Date().toISOString() })
      .eq('id', req.user?.id);

    await logAuditEvent({
      userId: req.user?.id,
      action: 'password_changed',
      entityType: 'user',
      entityId: req.user?.id,
      ipAddress: clientIp(req),
    });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
}

export async function revokeSessions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('token_version')
      .eq('id', req.user?.id)
      .single();

    const nextVersion = (user?.token_version || 0) + 1;

    await supabase
      .from('users')
      .update({ token_version: nextVersion, updated_at: new Date().toISOString() })
      .eq('id', req.user?.id);

    await logAuditEvent({
      userId: req.user?.id,
      action: 'sessions_revoked',
      entityType: 'user',
      entityId: req.user?.id,
      ipAddress: clientIp(req),
    });

    res.json({ message: 'All sessions signed out. Please log in again.' });
  } catch (error) {
    console.error('Revoke sessions error:', error);
    res.status(500).json({ message: 'Failed to revoke sessions' });
  }
}

export async function deactivateAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id, role, token_version')
      .eq('id', req.user?.id)
      .single();

    if (!user) {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }

    if (user.role === 'admin') {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true);

      if ((count ?? 0) <= 1) {
        res.status(400).json({ message: 'Cannot deactivate the only active administrator.' });
        return;
      }
    }

    await supabase
      .from('users')
      .update({
        is_active: false,
        token_version: (user.token_version || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await logAuditEvent({
      userId: req.user?.id,
      action: 'account_deactivated',
      entityType: 'user',
      entityId: req.user?.id,
      ipAddress: clientIp(req),
    });

    res.json({ message: 'Account deactivated. You have been signed out.' });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ message: 'Failed to deactivate account' });
  }
}

export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ message: 'Password is required to delete your account' });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user?.id)
      .single();

    if (error || !user) {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }

    if (user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(400).json({ message: 'Password is incorrect' });
        return;
      }
    }

    if (user.role === 'admin') {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('is_active', true);

      if ((count ?? 0) <= 1) {
        res.status(400).json({ message: 'Cannot delete the only active administrator.' });
        return;
      }
    }

    await logAuditEvent({
      userId: user.id,
      action: 'account_deleted',
      entityType: 'user',
      entityId: user.id,
      ipAddress: clientIp(req),
    });

    await supabase.from('users').delete().eq('id', user.id);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
}

const AVATARS_DIR = '/uploads/avatars/';
const AVATARS_BUCKET = 'avatars';

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

    const file = req.file;
    const ext = path.extname(file.originalname) || '.jpg';
    const key = `avatar-${crypto.randomUUID()}${ext}`;
    const contentType = file.mimetype;

    const uploadToStorage = () =>
      supabase.storage.from(AVATARS_BUCKET).upload(key, file.buffer, { contentType });

    let avatarValue: string;
    const { error: uploadError } = await uploadToStorage();

    if (uploadError) {
      await supabase.storage.createBucket(AVATARS_BUCKET, { public: true });
      const { error: retryError } = await uploadToStorage();
      if (!retryError) {
        avatarValue = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(key).data.publicUrl;
      } else if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
        const dir = path.join(process.cwd(), 'uploads', 'avatars');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, key), req.file.buffer);
        avatarValue = `${AVATARS_DIR}${key}`;
      } else {
        throw retryError;
      }
    } else {
      avatarValue = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(key).data.publicUrl;
    }

    const { avatar: previousAvatar } = user;
    if (previousAvatar?.includes(`/object/public/${AVATARS_BUCKET}/`)) {
      const prevKey = decodeURIComponent(
        (previousAvatar.split(`/object/public/${AVATARS_BUCKET}/`)[1] ?? '').split('?')[0],
      );
      if (prevKey) await supabase.storage.from(AVATARS_BUCKET).remove([prevKey]);
    } else if (
      previousAvatar?.startsWith(AVATARS_DIR) &&
      process.env.NODE_ENV !== 'production'
    ) {
      try {
        const oldPath = path.join(process.cwd(), previousAvatar.slice(1));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch {
        // Best-effort cleanup of the previous local file.
      }
    }

    const { error } = await supabase
      .from('users')
      .update({ avatar: avatarValue, updated_at: new Date().toISOString() })
      .eq('id', req.user?.id);

    if (error) throw error;

    await logAuditEvent({
      userId: req.user?.id,
      action: 'avatar_updated',
      entityType: 'user',
      entityId: req.user?.id,
      ipAddress: clientIp(req),
    });

    res.json({ avatar: avatarValue });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
}