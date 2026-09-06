import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, FileText } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import { privacySections, termsSections } from '../data/legalContent';

interface LegalModalProps {
  doc: 'privacy' | 'terms' | null;
  onClose: () => void;
  onSwitch?: (doc: 'privacy' | 'terms') => void;
}

export default function LegalModal({ doc, onClose, onSwitch }: LegalModalProps) {
  const sections = doc === 'privacy' ? privacySections : termsSections;
  const { dialogRef } = useModalA11y(!!doc, { onClose });

  return (
    <AnimatePresence>
      {doc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="legal-modal-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
                  {doc === 'privacy' ? <ShieldCheck className="h-5 w-5 text-white" /> : <FileText className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <h2 id="legal-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                    {doc === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Last updated: {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-slate-200 px-5 py-2.5 dark:border-slate-800 sm:px-6">
              {(['privacy', 'terms'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => onSwitch?.(key)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    doc === key
                      ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  {key === 'privacy' ? 'Privacy' : 'Terms'}
                </button>
              ))}
            </div>

            <div className="space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {sections.map((section) => (
                <div key={section.title}>
                  <h3 className="mb-1.5 text-sm font-bold text-slate-900 dark:text-white">{section.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{section.body}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800 sm:px-6">
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-indigo-700"
              >
                I Understand
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}