import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { completeGoogleOAuth } = useAuth();
  const [error, setError] = useState(searchParams.get('error') || '');

  const token = searchParams.get('token');

  useEffect(() => {
    if (error) return;
    if (!token) {
      setError('Sign-in could not be completed.');
      return;
    }
    completeGoogleOAuth(token)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch(() => setError('Sign-in failed. Please try again.'));
  }, [token, error, navigate, completeGoogleOAuth]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 px-4 dark:from-slate-950 dark:to-slate-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm text-center"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25">
          <BookOpen className="h-7 w-7 text-white" />
        </div>

        {error ? (
          <>
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Link
              to="/?auth=login"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
            >
              Back to Sign In
            </Link>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Completing sign in...</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}