import nodemailer from 'nodemailer';

interface OTPEntry {
  code: string;
  expiresAt: number;
  email: string;
}

const otpStore = new Map<string, OTPEntry>();
const OTP_TTL = 5 * 60 * 1000;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export function createOTP(email: string): string {
  const code = generateCode();
  otpStore.set(email.toLowerCase(), {
    code,
    expiresAt: Date.now() + OTP_TTL,
    email: email.toLowerCase(),
  });
  return code;
}

export function verifyOTP(email: string, code: string): boolean {
  const entry = otpStore.get(email.toLowerCase());
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return false;
  }
  if (entry.code !== code) return false;
  otpStore.delete(email.toLowerCase());
  return true;
}

export async function sendOTPEmail(email: string, code: string): Promise<void> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`\n====== OTP CODE FOR ${email}: ${code} ======\n`);
    return;
  }

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
}
