import { useState, useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { sendOTP, verifyOTPAndRegister } from '../services/api';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';

export default function VerifyOTP() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const name = searchParams.get('name') || '';
  const email = searchParams.get('email') || '';
  const password = searchParams.get('password') || '';
  const institution = searchParams.get('institution') || '';
  const gender = searchParams.get('gender') || '';
  const classLevel = searchParams.get('classLevel') || '';
  const dateOfBirth = searchParams.get('dateOfBirth') || '';
  const devCode = searchParams.get('devCode') || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (user) {
    navigate('/');
    return null;
  }

  if (!email) {
    navigate('/register');
    return null;
  }

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = pasted.split('').concat(Array(6 - pasted.length).fill(''));
    setCode(newCode);
    if (pasted.length > 0) {
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = code.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await verifyOTPAndRegister({
        email,
        code: otpCode,
        name,
        password,
        institution,
        gender,
        classLevel,
        dateOfBirth,
      });
      localStorage.setItem('passco-token', res.token);
      localStorage.setItem('passco-user', JSON.stringify(res.user));
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message
        : 'Verification failed';
      setError(msg || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      const res = await sendOTP(email);
      if ('code' in res) {
        setCode((res as { code: string }).code.split(''));
      }
    } catch {
      setError('Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 px-4 dark:from-slate-950 dark:to-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-6 text-center">
          <motion.div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
          >
            <Shield className="h-7 w-7 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verify your email</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            We sent a 6-digit code to<br />
            <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>
          </p>
          {devCode && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400 font-mono">
              Dev code: <span className="font-bold tracking-widest">{devCode}</span>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
            >
              {error}
            </motion.div>
          )}

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-lg bg-emerald-50 p-4 text-center text-sm text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              Account created successfully! Redirecting...
            </motion.div>
          ) : (
            <>
              <div className="mb-6 flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="h-12 w-12 rounded-xl border border-slate-300 bg-white text-center text-lg font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                ))}
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || code.join('').length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>

              <div className="mt-4 flex items-center justify-between text-sm">
                <button
                  onClick={() => navigate('/register')}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
