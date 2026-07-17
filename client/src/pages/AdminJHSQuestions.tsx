import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { jhs1Beginner, jhs1Intermediate, jhs1Expert } from '../data/jhs1Questions';
import { jhs2Beginner, jhs2Intermediate, jhs2Expert } from '../data/jhs2Questions';
import { jhs3Beginner, jhs3Intermediate, jhs3Expert } from '../data/jhs3Questions';
import { CLASS_META, SUBJECT_META, type JHSCategory, type BankQuestion } from '../data/questionBank';
import { getApprovedBankQuestions } from '../services/api';
import {
  Search, BookOpen, ChevronLeft, ChevronRight,
  Filter, Hash, CheckCircle2, Loader2, Upload,
} from 'lucide-react';
import { fadeUp } from '../utils/animations';
import { cn } from '../utils';

interface QuestionWithMeta extends BankQuestion {
  classLevel: JHSCategory;
  difficulty: string;
  source?: 'static' | 'bank';
}

const allStaticQuestions: QuestionWithMeta[] = [
  ...jhs1Beginner.map((q) => ({ ...q, classLevel: 'jhs1' as const, difficulty: 'beginner' })),
  ...jhs1Intermediate.map((q) => ({ ...q, classLevel: 'jhs1' as const, difficulty: 'intermediate' })),
  ...jhs1Expert.map((q) => ({ ...q, classLevel: 'jhs1' as const, difficulty: 'expert' })),
  ...jhs2Beginner.map((q) => ({ ...q, classLevel: 'jhs2' as const, difficulty: 'beginner' })),
  ...jhs2Intermediate.map((q) => ({ ...q, classLevel: 'jhs2' as const, difficulty: 'intermediate' })),
  ...jhs2Expert.map((q) => ({ ...q, classLevel: 'jhs2' as const, difficulty: 'expert' })),
  ...jhs3Beginner.map((q) => ({ ...q, classLevel: 'jhs3' as const, difficulty: 'beginner' })),
  ...jhs3Intermediate.map((q) => ({ ...q, classLevel: 'jhs3' as const, difficulty: 'intermediate' })),
  ...jhs3Expert.map((q) => ({ ...q, classLevel: 'jhs3' as const, difficulty: 'expert' })),
];

const CLASS_COLORS: Record<JHSCategory, string> = {
  jhs1: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  jhs2: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  jhs3: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  expert: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
};

const SUBJECT_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
};

const SUBJECT_NAMES = Object.keys(SUBJECT_META) as (keyof typeof SUBJECT_META)[];
const ITEMS_PER_PAGE = 20;

const CLASS_MAP: Record<string, JHSCategory> = {
  'JHS 1': 'jhs1', 'JHS 2': 'jhs2', 'JHS 3': 'jhs3',
  'jhs1': 'jhs1', 'jhs2': 'jhs2', 'jhs3': 'jhs3',
};

const SUBJECT_MAP: Record<string, string> = {
  'Mathematics': 'mathematics', 'Science': 'science', 'English Language': 'english',
  'Social Studies': 'social-studies', 'ICT': 'ict',
  'Religious and Moral Education': 'rme', 'Religious & Moral Education': 'rme',
  'Creative Arts and Design': 'creative-arts', 'Career Technology': 'career-tech',
};

export default function AdminJHSQuestions() {
  const [classFilter, setClassFilter] = useState<'all' | JHSCategory>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'multiple-choice' | 'true-false'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [backendQuestions, setBackendQuestions] = useState<QuestionWithMeta[]>([]);
  const [loadingBackend, setLoadingBackend] = useState(true);

  useEffect(() => {
    getApprovedBankQuestions()
      .then(({ questions }) => {
        const mapped: QuestionWithMeta[] = questions.map(q => ({
          id: q.id,
          question: q.question,
          type: q.type as BankQuestion['type'],
          options: q.options,
          correctAnswer: q.correctAnswer,
          subject: SUBJECT_MAP[q.subject] || q.subject || 'english',
          explanation: q.explanation,
          classLevel: CLASS_MAP[q.classLevel] || 'jhs2',
          difficulty: q.difficulty || 'intermediate',
          source: 'bank' as const,
        }));
        setBackendQuestions(mapped);
      })
      .catch(() => {})
      .finally(() => setLoadingBackend(false));
  }, []);

  const allQuestions: QuestionWithMeta[] = useMemo(() => [
    ...allStaticQuestions,
    ...backendQuestions,
  ], [backendQuestions]);

  const filtered = useMemo(() => {
    return allQuestions.filter((q) => {
      if (classFilter !== 'all' && q.classLevel !== classFilter) return false;
      if (subjectFilter !== 'all' && q.subject.toLowerCase() !== subjectFilter.toLowerCase()) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (typeFilter !== 'all' && q.type !== typeFilter) return false;
      if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allQuestions, classFilter, subjectFilter, difficultyFilter, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const mcqCount = filtered.filter((q) => q.type === 'multiple-choice').length;
  const tfCount = filtered.filter((q) => q.type === 'true-false').length;

  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const q of filtered) {
      counts[q.subject] = (counts[q.subject] || 0) + 1;
    }
    return counts;
  }, [filtered]);

  return (
    <div className="p-4 sm:p-6">
      <motion.div
        className="mb-6"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">JHS Question Browser</h1>
            <motion.span
              className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
              key={filtered.length}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
            >
              {filtered.length}
            </motion.span>
          </div>
          <Link
            to="/admin/bulk-upload"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Browse and search all {allQuestions.length} JHS assessment questions
          ({allStaticQuestions.length} static + {backendQuestions.length} from uploads)
          across 3 classes and 8 subjects.
          {loadingBackend && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
        </p>
      </motion.div>

      <motion.div
        className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Filters</span>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search question text..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
          />
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Class</span>
            {(['all', 'jhs1', 'jhs2', 'jhs3'] as const).map((f) => (
              <motion.button
                key={f}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setClassFilter(f); setPage(1); }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  classFilter === f
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                )}
              >
                {f === 'all' ? 'All' : CLASS_META[f].label}
              </motion.button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Subject</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setSubjectFilter('all'); setPage(1); }}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                subjectFilter === 'all'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              )}
            >
              All
            </motion.button>
            {SUBJECT_NAMES.map((key) => {
              const meta = SUBJECT_META[key];
              return (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setSubjectFilter(key); setPage(1); }}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                    subjectFilter === key
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  )}
                >
                  {meta.icon} {meta.label}
                </motion.button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Level</span>
            {(['all', 'beginner', 'intermediate', 'expert'] as const).map((f) => (
              <motion.button
                key={f}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setDifficultyFilter(f); setPage(1); }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  difficultyFilter === f
                    ? f === 'beginner' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : f === 'intermediate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        : f === 'expert' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                )}
              >
                {f === 'all' ? 'All Levels' : f.charAt(0).toUpperCase() + f.slice(1)}
              </motion.button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Type</span>
            {(['all', 'multiple-choice', 'true-false'] as const).map((f) => (
              <motion.button
                key={f}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setTypeFilter(f); setPage(1); }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                  typeFilter === f
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                )}
              >
                {f === 'all' ? 'All Types' : f === 'multiple-choice' ? 'MCQ' : 'True / False'}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={2}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {filtered.length} total
            </span>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
              MCQ
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">{mcqCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              T/F
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">{tfCount}</span>
          </div>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="flex flex-wrap gap-1.5">
            {SUBJECT_NAMES.map((key) => {
              const count = subjectCounts[key] || 0;
              if (count === 0) return null;
              const meta = SUBJECT_META[key];
              const colorClass = SUBJECT_COLORS[meta.color] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
              return (
                <span key={key} className={cn('rounded-md px-2 py-0.5 text-[10px] font-semibold', colorClass)}>
                  {meta.icon} {count}
                </span>
              );
            })}
          </div>
        </div>
      </motion.div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {paginated.map((q, i) => {
            const subjectMeta = SUBJECT_META[q.subject as keyof typeof SUBJECT_META];
            const subjectColor = subjectMeta ? SUBJECT_COLORS[subjectMeta.color] : '';
            return (
              <motion.div
                key={`${q.classLevel}-${q.difficulty}-${q.id}`}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -80 }}
                transition={{ duration: 0.25, delay: i * 0.02 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 transition-all dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="flex items-center justify-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    #{(safePage - 1) * ITEMS_PER_PAGE + i + 1}
                  </span>
                  <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold', CLASS_COLORS[q.classLevel])}>
                    {CLASS_META[q.classLevel].label}
                  </span>
                  {subjectMeta && (
                    <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold', subjectColor)}>
                      {subjectMeta.icon} {subjectMeta.label}
                    </span>
                  )}
                  <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold', DIFFICULTY_COLORS[q.difficulty] || '')}>
                    {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                  </span>
                  <span className={cn(
                    'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                    q.type === 'multiple-choice'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                  )}>
                    {q.type === 'multiple-choice' ? 'MCQ' : 'T/F'}
                  </span>
                  {q.source === 'bank' && (
                    <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                      Uploaded
                    </span>
                  )}
                </div>

                <p className="mb-3 text-sm font-medium text-slate-800 dark:text-white leading-relaxed">
                  {q.question}
                </p>

                {q.type === 'multiple-choice' && q.options && (
                  <div className="mb-3 space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const letter = String.fromCharCode(65 + oi);
                      const isCorrect = letter === q.correctAnswer || opt === q.correctAnswer;
                      return (
                        <div
                          key={oi}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition',
                            isCorrect
                              ? 'bg-emerald-50 text-emerald-700 font-semibold dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-slate-50 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400'
                          )}
                        >
                          <span className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold',
                            isCorrect
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          )}>
                            {letter}
                          </span>
                          <span>{opt}</span>
                          {isCorrect && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-500" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.type === 'true-false' && (
                  <div className="mb-3 flex gap-2">
                    <div className={cn(
                      'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                      q.correctAnswer === true
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    )}>
                      {q.correctAnswer === true && <CheckCircle2 className="h-4 w-4" />}
                      True
                    </div>
                    <div className={cn(
                      'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition',
                      q.correctAnswer === false
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                    )}>
                      {q.correctAnswer === false && <CheckCircle2 className="h-4 w-4" />}
                      False
                    </div>
                  </div>
                )}

                {q.explanation && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                    <p className="text-xs text-slate-500 italic dark:text-slate-400 leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"
          >
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              No questions match your filters.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Try adjusting your search or filter criteria.
            </p>
          </motion.div>
        )}
      </div>

      {totalPages > 1 && (
        <motion.div
          className="mt-6 flex items-center justify-center gap-3"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </motion.button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Page <span className="font-semibold text-slate-700 dark:text-white">{safePage}</span> of {totalPages}
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
