import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, XCircle, Lock, Search, Home, CheckCircle2 } from 'lucide-react';
import AnimatedSpinner from '../components/AnimatedSpinner';
import { verifyReportCode } from '../services/api';
import type { ReportVerifyResponse } from '../types';

export default function VerifyReport() {
  const { code } = useParams<{ code: string }>();
  const [query, setQuery] = useState(code || '');
  const [result, setResult] = useState<ReportVerifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState('');

  const run = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(trimmed);
    setResult(null);
    try {
      setResult(await verifyReportCode(trimmed));
    } catch {
      setResult({ found: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code) {
      setQuery(code);
      run(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/images/logos/qna.svg" alt="Passco" className="h-12 w-auto object-contain mix-blend-multiply dark:mix-blend-screen" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Home className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
                <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">Verify a Report</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Authenticate a PASSCO Academic Report Card
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); run(query); }}
              className="flex gap-2"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="PASSCO-VRF-XXXXXXXX"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium tracking-wide text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search className="h-4 w-4" /> Verify
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              Enter the unique verification code printed on the report card.
            </p>

            {/* Result */}
            <div className="mt-6">
              {loading && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 py-8 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                  <AnimatedSpinner /> Verifying code…
                </div>
              )}

              {!loading && result && !result.found && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-500/30 dark:bg-rose-500/10">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                    <XCircle className="h-5 w-5" />
                    <p className="font-semibold">Report not found</p>
                  </div>
                  <p className="mt-2 text-sm text-rose-600/90 dark:text-rose-400/90">
                    No report matches the code <strong className="font-mono">{searched}</strong>. Double-check the code or contact PASSCO support if you believe this is an error.
                  </p>
                </div>
              )}

              {!loading && result?.found && (
                <div className="overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-500/30">
                  <div className="bg-emerald-50 px-5 py-3 dark:bg-emerald-500/10">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <p className="text-sm font-bold">Report Verified</p>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 bg-white px-5 dark:divide-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between py-3 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Student</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{result.studentNameMasked}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Report Number</span>
                      <span className="font-mono text-slate-900 dark:text-white">{result.reportNumber}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Period</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{result.academicYear} · {result.term}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Overall Score</span>
                      <span className="font-bold text-slate-900 dark:text-white">{result.overallScore}%</span>
                    </div>
                    <div className="flex items-center justify-between py-3 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Overall Grade</span>
                      <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">{result.overallGrade}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 text-sm">
                      <span className="text-slate-500 dark:text-slate-400">Issued</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {result.generatedAt ? new Date(result.generatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {!loading && !result && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-400 dark:bg-slate-800/50 dark:text-slate-500">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  Verification confirms the report was issued by PASSCO and has not been altered.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}