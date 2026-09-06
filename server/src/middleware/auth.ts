import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types';
import { supabase } from '../config/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'passco-super-secret-key-change-in-production';

export interface TokenPayload {
  id: string;
  role: 'student' | 'admin';
  email: string;
  v?: number;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    const { data: user } = await supabase
      .from('users')
      .select('is_active, token_version')
      .eq('id', decoded.id)
      .maybeSingle();

    if (!user || user.is_active === false) {
      res.status(401).json({ message: 'This account is not active.' });
      return;
    }

    if (user.token_version !== (typeof decoded.v === 'number' ? decoded.v : 0)) {
      res.status(401).json({ message: 'Session revoked. Please log in again.' });
      return;
    }

    req.user = { id: decoded.id, role: decoded.role, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }
  next();
}

export function requireStudent(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'student') {
    res.status(403).json({ message: 'Student access required' });
    return;
  }
  next();
}

export function generateToken(
  user: { id: string; role: 'student' | 'admin'; email: string },
  version = 0
): string {
  return jwt.sign({ ...user, v: version }, JWT_SECRET, { expiresIn: '7d' });
}