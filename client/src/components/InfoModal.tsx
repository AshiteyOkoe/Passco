import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Trophy, Quote, Star, Layers, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import { useAuth } from '../context/AuthContext';
import FAQSection from './FAQSection';
import { DefaultAvatar } from './DefaultAvatars';
import { resolveUploadUrl, getLeaderboard, getTestimonials, isCustomAvatar, getQuestionCounts, type LeaderboardEntry } from '../services/api';
import type { Testimonial } from '../types';
import { getRewardLabel } from '../utils/rewards';
import { SUBJECT_META, type SubjectId } from '../data/questionBank';

export type InfoModalKind = 'faq' | 'leaderboard' | 'testimonials' | 'subjects' | null;

interface InfoModalProps {
  kind: InfoModalKind;
  onClose: () => void;
  onRequireAuth?: (tab: 'login' | 'register') => void;
}

const KIND_META: Record<
  Exclude<InfoModalKind, null>,
  { title: string; subtitle: string; label: string; icon: LucideIcon; chip: string; titleId: string }
> = {
  faq: {
    title: 'Frequently Asked Questions',
    subtitle: 'Quick answers about Passco, subscriptions and assessments.',
    label: 'FAQs',
    icon: HelpCircle,
    chip: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400',
    titleId: 'info-modal-faq-title',
  },
  leaderboard: {
    title: 'Leaderboard',
    subtitle: "See who's leading the pack.",
    label: 'Leaderboard',
    icon: Trophy,
    chip: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    titleId: 'info-modal-leaderboard-title',
  },
  testimonials: {
    title: 'What Students Say',
    subtitle: 'Real experiences from students preparing with Passco.',
    label: 'Testimonials',
    icon: Quote,
    chip: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
    titleId: 'info-modal-testimonials-title',
  },
  subjects: {
    title: 'Explore Subjects',
    subtitle: 'Every subject comes with a rich bank of objective questions across all three JHS levels.',
    label: 'Subjects',
    icon: Layers,
    chip: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
    titleId: 'info-modal-subjects-title',
  },
};

const rankClass = (rank: number) => {
  if (rank === 1) return 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20';
  if (rank === 2) return 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md shadow-slate-500/20';
  if (rank === 3) return 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-500/20';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
};

const rankBadge = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

function renderStars(rating: number) {
  return Array.from({ length: 5 }).map((_, s) => (
    <Star
      key={s}
      aria-hidden="true"
      className={`h-4 w-4 ${s < (rating || 5) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'}`}
    />
  ));
}

const SUBJECTS: SubjectId[] = [
  'mathematics',
  'science',
  'english',
  'social-studies',
  'ict',
  'rme',
  'creative-arts',
  'career-tech',
];

function SubjectsBody({ onRequireAuth }: { onRequireAuth?: (tab: 'login' | 'register') => void }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    getQuestionCounts()
      .then(({ counts: c }) => {
        if (active) setCounts(c);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {SUBJECTS.map((subject) => {
        const meta = SUBJECT_META[subject];
        const count = counts[subject] || 0;
        return (
          <div
            key={subject}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-slate-50/50 p-5 transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-700 dark:hover:bg-blue-500/5"
          >
            <meta.icon className="h-7 w-7" aria-hidden="true" />
            <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{meta.label}</h3>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {count > 0 ? `${count} question${count !== 1 ? 's' : ''} available` : 'Question bank available'}
            </p>
            {user ? (
              <Link
                to="/assessment/setup"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition group-hover:gap-2.5 dark:text-blue-400"
              >
                Start Practice
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <button
                onClick={() => onRequireAuth?.('register')}
                className="mt-4 inline-flex items-center gap-1.5 self-start text-sm font-semibold text-blue-600 transition group-hover:gap-2.5 dark:text-blue-400"
              >
                Start Practice
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LeaderboardBody() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    getLeaderboard()
      .then(({ leaderboard }) => {
        if (active) setEntries(leaderboard);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, []);

  if (entries === null) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading leaderboard...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <Trophy className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" aria-hidden="true" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Completed assessments are on their way. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {entries.slice(0, 10).map((entry, i) => {
        const rank = i + 1;
        const reward = getRewardLabel(entry.avg);
        const RewardIcon = reward.icon;
        const isCurrentUser = user && entry.name === user.name;

        return (
          <div
            key={entry.id}
            className={`flex items-center gap-3 rounded-xl border p-3 sm:p-3.5 ${
              rank <= 3
                ? 'border-amber-200 bg-amber-50/40 dark:border-amber-800/50 dark:bg-amber-500/5'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'
            } ${isCurrentUser ? 'ring-2 ring-indigo-500/30 dark:ring-indigo-400/30' : ''}`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${rankClass(rank)}`}>
              {rankBadge(rank)}
            </span>
            {isCustomAvatar(entry.avatar) ? (
              <img
                src={resolveUploadUrl(entry.avatar)}
                alt={entry.name}
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-800"
              />
            ) : (
              <DefaultAvatar
                gender={(entry.gender as 'male' | 'female') || undefined}
                size={40}
                className="h-10 w-10 shrink-0 rounded-full ring-2 ring-white dark:ring-slate-800"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-bold ${isCurrentUser ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'}`}>
                {entry.name}
              </p>
              <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                {[entry.institution, entry.classLevel].filter(Boolean).join(' · ') || 'Passco Student'}
              </p>
            </div>
            <span className="shrink-0 text-right text-sm font-bold text-slate-900 dark:text-white">
              {Math.round(entry.avg)}%
            </span>
            <span className={`hidden shrink-0 items-center gap-1 text-xs font-semibold sm:inline-flex ${reward.color}`}>
              <RewardIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {reward.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TestimonialsBody() {
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(null);

  useEffect(() => {
    let active = true;
    getTestimonials()
      .then(({ testimonials: t }) => {
        if (active) setTestimonials(t);
      })
      .catch(console.error);
    return () => {
      active = false;
    };
  }, []);

  if (testimonials === null) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="text-sm text-slate-400 dark:text-slate-500">Loading testimonials...</p>
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <Quote className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" aria-hidden="true" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Student testimonials are on their way. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {testimonials.map((t) => (
        <div key={t.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-3 flex items-center gap-1">{renderStars(t.rating)}</div>
          <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">"{t.quote}"</p>
          <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3.5 dark:border-slate-800">
            {isCustomAvatar(t.avatar_url) ? (
              <img src={resolveUploadUrl(t.avatar_url)} alt={t.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-rose-200 dark:ring-rose-800" />
            ) : (
              <DefaultAvatar gender="" size={40} className="rounded-full ring-2 ring-rose-200 dark:ring-rose-800" />
            )}
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {[t.role, t.school].filter(Boolean).join(' · ') || 'Passco Student'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FAQBody() {
  return <FAQSection />;
}

export default function InfoModal({ kind, onClose, onRequireAuth }: InfoModalProps) {
  const { dialogRef } = useModalA11y(!!kind, { onClose });
  const meta = kind ? KIND_META[kind] : null;

  return (
    <AnimatePresence>
      {kind && meta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={meta.titleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.chip}`}>
                  <meta.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id={meta.titleId} className="text-base font-bold text-slate-900 dark:text-white">
                    {meta.title}
                  </h2>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">{meta.subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
              {kind === 'faq' && <FAQBody />}
              {kind === 'leaderboard' && <LeaderboardBody />}
              {kind === 'testimonials' && <TestimonialsBody />}
              {kind === 'subjects' && <SubjectsBody onRequireAuth={onRequireAuth} />}
            </div>

            <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-800 sm:px-6">
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-indigo-700"
              >
                {kind === 'faq' ? 'I Understand' : 'Got It'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}