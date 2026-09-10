import nodemailer from 'nodemailer';
import { supabase } from '../config/supabase';

interface OTPEntry {
  code: string;
  expiresAt: number;
  email: string;
}

// Primary store is the Supabase `otp_codes` table (survives restarts/cold starts).
// This in-memory map is only a fallback if the table is missing or unreachable.
const otpStore = new Map<string, OTPEntry>();
const OTP_TTL = 5 * 60 * 1000;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
}

export async function createOTP(email: string): Promise<string> {
  const code = generateCode();
  const normalized = email.toLowerCase();
  const expiresAt = new Date(Date.now() + OTP_TTL).toISOString();

  // Keep only one active code per email so stale codes can't be replayed.
  await supabase.from('otp_codes').delete().eq('email', normalized);

  const { error } = await supabase
    .from('otp_codes')
    .insert({ email: normalized, code, expires_at: expiresAt });

  if (error) {
    // Table missing (migration not applied) or transient failure: fall back to memory.
    otpStore.set(normalized, {
      code,
      expiresAt: Date.now() + OTP_TTL,
      email: normalized,
    });
  }

  return code;
}

export async function verifyOTP(email: string, code: string): Promise<boolean> {
  const normalized = email.toLowerCase();
  const now = Date.now();

  const { data: rows, error } = await supabase
    .from('otp_codes')
    .select('id, code, expires_at')
    .eq('email', normalized);

  if (!error) {
    const valid = rows?.find(
      (r) => r.code === code && new Date(r.expires_at).getTime() > now
    );
    if (valid) {
      await supabase.from('otp_codes').delete().eq('id', valid.id);
      return true;
    }
    if (rows && rows.length > 0) {
      await supabase
        .from('otp_codes')
        .delete()
        .eq('email', normalized)
        .lt('expires_at', new Date(now).toISOString());
    }
  }

  // Fallback: check the in-memory store (covers a missing table or a failed insert).
  const entry = otpStore.get(normalized);
  if (!entry) return false;
  if (now > entry.expiresAt) {
    otpStore.delete(normalized);
    return false;
  }
  if (entry.code !== code) return false;
  otpStore.delete(normalized);
  return true;
}

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function testSMTPConnection(): Promise<{ ok: boolean; detail: string }> {
  if (!smtpConfigured()) {
    return { ok: false, detail: 'SMTP_HOST, SMTP_USER or SMTP_PASS is missing from the environment.' };
  }
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { ok: true, detail: 'SMTP connection verified (auth + server reachable).' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const tag = /Invalid login|535|auth/i.test(msg)
      ? 'AUTH_FAILED'
      : /getaddrinfo|ENOTFOUND|ECONNREFUSED|socket|timeout|ETIMEDOUT/i.test(msg)
        ? 'CONNECTION_FAILED'
        : /self-signed|certificate|tls/i.test(msg)
          ? 'TLS_FAILED'
          : 'OTHER';
    return { ok: false, detail: `[${tag}] ${msg}` };
  }
}

export async function sendOTPEmail(
  email: string,
  code: string
): Promise<{ sent: boolean; configured: boolean; error?: string }> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n====== OTP CODE FOR ${email}: ${code} ======\n`);
    return { sent: false, configured: false };
  }

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@passco.app',
      to: email,
      subject: 'Passco - Your Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">Passco Verification</h2>
          <p>Your verification code is:</p>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">${code}</span>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code expires in 5 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });
    return { sent: true, configured: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Failed to send email:', msg);
    console.log(`\n====== OTP CODE FOR ${email}: ${code} ======\n`);
    return { sent: false, configured: true, error: msg };
  }
}
