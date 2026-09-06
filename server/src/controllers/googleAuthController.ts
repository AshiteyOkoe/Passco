import { Request, Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { generateToken } from '../middleware/auth';
import { grantTrial } from '../services/subscriptionService';
import { logAuditEvent } from '../services/auditService';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

const oauthStates = new Map<string, number>();

interface GoogleTokenResponse {
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleIdTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function decodeIdToken(idToken: string): GoogleIdTokenPayload | null {
  try {
    const [, payloadB64] = idToken.split('.');
    if (!payloadB64) return null;
    const json = Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json) as GoogleIdTokenPayload;
  } catch {
    return null;
  }
}

export function googleAuth(req: Request, res: Response): void {
  if (!GOOGLE_CLIENT_ID) {
    res.status(500).json({ message: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID to the server .env and restart.' });
    return;
  }

  const state = crypto.randomBytes(24).toString('hex');
  oauthStates.set(state, Date.now());

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error: googleError } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (googleError) {
    res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Google sign-in was cancelled.')}`);
    return;
  }

  if (!code || !state) {
    res.status(400).json({ message: 'Missing OAuth code or state' });
    return;
  }

  const issuedAt = oauthStates.get(state);
  oauthStates.delete(state);
  if (!issuedAt || Date.now() - issuedAt > 10 * 60 * 1000) {
    res.status(400).json({ message: 'Invalid or expired OAuth state' });
    return;
  }

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokenData.id_token) {
      console.error('Google token exchange failed:', tokenData.error, tokenData.error_description);
      res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Google sign-in failed. Please try again.')}`);
      return;
    }

    const payload = decodeIdToken(tokenData.id_token);
    if (!payload?.email || !payload.email_verified) {
      res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Your Google account email is not verified.')}`);
      return;
    }

    const email = payload.email.toLowerCase();

    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    let user;
    if (existing) {
      user = existing;
    } else {
      const { data: created, error } = await supabase
        .from('users')
        .insert({
          name: payload.name || email.split('@')[0],
          email,
          password_hash: '',
          role: 'student',
          institution: '',
          grade_level: '',
          gender: null,
          class_level: '',
          avatar: payload.picture || '',
          date_of_birth: null,
        })
        .select()
        .single();

      if (error) throw error;
      user = created;
      await grantTrial(user.id);
    }

    const token = generateToken({ id: user.id, role: user.role, email: user.email }, user.token_version || 0);
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', user.id);
    await logAuditEvent({ userId: user.id, action: 'login', entityType: 'auth', entityId: user.id, ipAddress: req.ip || '' });
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}/auth/callback?error=${encodeURIComponent('Sign-in failed. Please try again.')}`);
  }
}