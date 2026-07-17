import { Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateToken } from '../middleware/auth';
import { AuthRequest } from '../types';
import fs from 'fs';
import path from 'path';

function userResponse(user: InstanceType<typeof User>) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    institution: user.institution,
    gradeLevel: user.gradeLevel,
    avatar: user.avatar || '',
    gender: user.gender || '',
    dateOfBirth: user.dateOfBirth || null,
    classLevel: user.classLevel || '',
  };
}

export async function register(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, role, institution, gradeLevel, dateOfBirth } = req.body;

    if (!dateOfBirth) {
      res.status(400).json({ message: 'Date of birth is required' });
      return;
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'student',
      institution,
      gradeLevel,
      dateOfBirth: new Date(dateOfBirth),
    });

    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    res.status(201).json({ token, user: userResponse(user) });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
}

export async function login(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    });

    res.json({ token, user: userResponse(user) });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
}

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ ...userResponse(user), createdAt: user.createdAt });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, gender, dateOfBirth, institution, gradeLevel, classLevel, avatar } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }

    if (name !== undefined) user.name = name;
    if (gender !== undefined) user.gender = gender;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
    if (institution !== undefined) user.institution = institution;
    if (gradeLevel !== undefined) user.gradeLevel = gradeLevel;
    if (classLevel !== undefined) user.classLevel = classLevel;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({ user: userResponse(user) });
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

    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }

    if (user.avatar && user.avatar.startsWith('/uploads/avatars/')) {
      const oldPath = path.join(process.cwd(), user.avatar);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();

    res.json({ avatar: user.avatar });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
}
