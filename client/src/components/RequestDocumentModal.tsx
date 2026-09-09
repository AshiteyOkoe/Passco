import { useState } from 'react';
import { X, FileText, Award, CheckCircle2, Loader2, Info } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import AnimatedSpinner from './AnimatedSpinner';
import { TERMS, type ReportTerm } from '../utils/reportCard';
import type { DocumentRequestKind, EligibilityResult } from '../types';

interface RequestDocumentModalProps {
  open: boolean;
  onClose: () => void;
  kind: DocumentRequestKind;
  years: number[];
  eligibility: EligibilityResult | null;
  loadingEligibility: boolean;
  submitting?: boolean;
  onSubmit: (payload: { kind: DocumentRequestKind; academicYear?: string; term?: string }) => void;
}

export default function RequestDocumentModal({
  open,
  onClose,
  kind,
  years,
  eligibility,
  loadingEligibility,
  submitting = false,
  onSubmit,
}: RequestDocumentModalProps) {
  const [year, setYear] = useState<number>(years[0] || new Date().getFullYear());
  const [term, setTerm] = useState<ReportTerm>('Full Year');
  const { dialogRef } = useModalA11y(open, { onClose });

  if (!open) return null;

  const isReport = kind === 'report';
  const eligible = !!eligibility?.eligible;
  const requirements = eligibility?.requirements || [];
  const canSubmit = !!eligibility && eligible;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => !submitting && onClose()} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-doc-title"
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
              {isReport ? <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> : <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
            </div>
            <div>
              <h2 id="request-doc-title" className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">
                {isReport ? 'Request Report Card' : 'Request A+ Certificate'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                An admin will review and issue it once approved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {loadingEligibility ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
              <AnimatedSpinner /> Checking your eligibility…
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Info className="h-4 w-4 text-indigo-500" /> Requirements
                </p>
                {requirements.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Eligibility is being verified.</p>
                ) : (
                  <ul className="space-y-2.5">
                    {requirements.map((req) => (
                      <li key={req.key} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-600 dark:text-slate-300">{req.label}</span>
                        <span className={`flex items-center gap-1.5 font-semibold ${req.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                          {req.met ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          {req.current} / {req.target}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {!eligible && (
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  {isReport
                    ? 'Your report could not be generated because there is not enough assessment data for the selected period.'
                    : "You haven't met the requirements yet. Complete them and you'll be able to submit this request."}
                </div>
              )}

              {isReport && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="request-year" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Academic Year
                    </label>
                    <select
                      id="request-year"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {years.length === 0 && <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="request-term" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Term
                    </label>
                    <select
                      id="request-term"
                      value={term}
                      onChange={(e) => setTerm(e.target.value as ReportTerm)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      {TERMS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
          <button
            onClick={() => onSubmit({ kind, academicYear: isReport ? String(year) : undefined, term: isReport ? term : undefined })}
            disabled={!canSubmit || submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isReport ? <FileText className="h-4 w-4" /> : <Award className="h-4 w-4" />}
            {submitting ? 'Submitting…' : isReport ? 'Submit Request' : 'Request Certificate'}
          </button>
        </div>
      </div>
    </div>
  );
}