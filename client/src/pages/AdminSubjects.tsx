import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, Filter, TrendingUp, TrendingDown,
  BarChart3, Layers, GraduationCap, FileUp,
} from 'lucide-react';
import { cn } from '../utils';
import {
  CLASS_META, SUBJECT_META, getSubjectQuestionCount,
  type JHSCategory, type SubjectId, type DifficultyLevel,
} from '../data/questionBank';
import { fadeUp, stagger, bounceIn, slideUp } from '../utils/animations';

const CLASS_KEYS: JHSCategory[] = ['jhs1', 'jhs2', 'jhs3'];
const SUBJECT_KEYS: SubjectId[] = Object.keys(SUBJECT_META) as SubjectId[];
const DIFFICULTIES: DifficultyLevel[] = ['beginner', 'intermediate', 'expert'];

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string; bar: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-200 dark:ring-blue-800', bar: 'bg-blue-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-800', bar: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-800', bar: 'bg-amber-500' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-800', bar: 'bg-violet-500' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400', ring: 'ring-cyan-200 dark:ring-cyan-800', bar: 'bg-cyan-500' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', ring: 'ring-purple-200 dark:ring-purple-800', bar: 'bg-purple-500' },
  pink: { bg: 'bg-pink-50 dark:bg-pink-500/10', text: 'text-pink-600 dark:text-pink-400', ring: 'ring-pink-200 dark:ring-pink-800', bar: 'bg-pink-500' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-200 dark:ring-orange-800', bar: 'bg-orange-500' },
};

const DIFF_COLOR_MAP: Record<DifficultyLevel, string> = {
  beginner: 'bg-emerald-500',
  intermediate: 'bg-amber-500',
  expert: 'bg-rose-500',
};

export default function AdminSubjects() {
  const [filterClass, setFilterClass] = useState<JHSCategory | 'all'>('all');

  const subjectData = useMemo(() => {
    return SUBJECT_KEYS.map((sub) => {
      const meta = SUBJECT_META[sub];

      const perClass = CLASS_KEYS.map((cls) => ({
        key: cls,
        label: CLASS_META[cls].label,
        count: getSubjectQuestionCount(cls, sub),
      }));

      const perDifficulty = DIFFICULTIES.map((d) => ({
        level: d,
        count: CLASS_KEYS.reduce((sum, cls) => sum + getSubjectQuestionCount(cls, sub, d), 0),
      }));

      const totalQuestions = perClass.reduce((sum, c) => sum + c.count, 0);

      return {
        key: sub,
        ...meta,
        perClass,
        perDifficulty,
        totalQuestions,
      };
    });
  }, []);

  const filtered = useMemo(() => {
    if (filterClass === 'all') return subjectData;
    return subjectData.map((s) => ({
      ...s,
      totalQuestions: getSubjectQuestionCount(filterClass, s.key),
      perClass: s.perClass.map((c) => ({
        ...c,
        count: c.key === filterClass ? getSubjectQuestionCount(filterClass, s.key) : 0,
      })),
      perDifficulty: DIFFICULTIES.map((d) => ({
        level: d,
        count: getSubjectQuestionCount(filterClass, s.key, d),
      })),
    }));
  }, [subjectData, filterClass]);

  const aggregate = useMemo(() => {
    const total = filtered.reduce((sum, s) => sum + s.totalQuestions, 0);
    const sorted = [...filtered].sort((a, b) => b.totalQuestions - a.totalQuestions);
    const most = sorted[0];
    const least = sorted[sorted.length - 1];
    return { totalQuestions: total, most, least };
  }, [filtered]);

  const maxTotal = Math.max(...filtered.map((s) => s.totalQuestions), 1);

  return (
    <div className="p-4 sm:p-6">
      <motion.div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manage Subjects</h1>
          <BookOpen className="hidden h-6 w-6 text-indigo-500 sm:block" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value as JHSCategory | 'all')}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
          >
            <option value="all">All Classes</option>
            {CLASS_KEYS.map((cls) => (
              <option key={cls} value={cls}>{CLASS_META[cls].label}</option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div
        className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <StatCard
          icon={Layers}
          value={filtered.length}
          label="Subjects"
          color="text-indigo-500"
          bg="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <StatCard
          icon={BarChart3}
          value={aggregate.totalQuestions}
          label="Total Questions"
          color="text-violet-500"
          bg="bg-violet-50 dark:bg-violet-500/10"
        />
        <StatCard
          icon={TrendingUp}
          value={aggregate.most?.totalQuestions ?? 0}
          label={`Most: ${aggregate.most?.label ?? '-'}`}
          color="text-emerald-500"
          bg="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <StatCard
          icon={TrendingDown}
          value={aggregate.least?.totalQuestions ?? 0}
          label={`Least: ${aggregate.least?.label ?? '-'}`}
          color="text-rose-500"
          bg="bg-rose-50 dark:bg-rose-500/10"
        />
      </motion.div>

      <motion.div
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {filtered.map((sub, idx) => {
          const colors = COLOR_MAP[SUBJECT_META[sub.key].color] ?? COLOR_MAP.blue;

          return (
            <motion.div
              key={sub.key}
              variants={slideUp}
              whileHover={{ y: -4, boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }}
              className={cn(
                'rounded-2xl border bg-white p-5 dark:bg-slate-900',
                colors.ring,
                'border-slate-200 dark:border-slate-800'
              )}
            >
              <div className="mb-4 flex items-center gap-3">
                <motion.div
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl',
                    colors.bg
                  )}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: idx * 0.06 }}
                >
                  {sub.icon}
                </motion.div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-slate-800 dark:text-white">{sub.label}</h3>
                  <p className={cn('text-lg font-extrabold', colors.text)}>{sub.totalQuestions}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Questions</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Per Class
                </p>
                <div className="space-y-1.5">
                  {sub.perClass.map((c) => {
                    const barPct = maxTotal > 0 ? (c.count / maxTotal) * 100 : 0;
                    return (
                      <div key={c.key} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          {c.label}
                        </span>
                        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <motion.div
                            className={cn('absolute inset-y-0 left-0 rounded-full', colors.bar)}
                            initial={{ width: '0%' }}
                            animate={{ width: `${barPct}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.04, ease: 'easeOut' }}
                          />
                        </div>
                        <span className="w-6 text-right text-[11px] font-bold text-slate-600 dark:text-slate-400">
                          {c.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Per Difficulty
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {sub.perDifficulty.map((d) => {
                    const pct = sub.totalQuestions > 0 ? Math.round((d.count / sub.totalQuestions) * 100) : 0;
                    return (
                      <div key={d.level} className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-800/50">
                        <div className={cn('mx-auto mb-1 h-1.5 w-6 rounded-full', DIFF_COLOR_MAP[d.level])} />
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{d.count}</p>
                        <p className="text-[9px] font-medium uppercase text-slate-500 dark:text-slate-400">
                          {d.level.slice(0, 3)}
                        </p>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={cn('h-full rounded-full', DIFF_COLOR_MAP[d.level])}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Link to={`/admin/bulk-upload?subject=${sub.key}`}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    'mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition',
                    colors.bg, colors.text,
                    'hover:opacity-80'
                  )}
                >
                  <FileUp className="h-3.5 w-3.5" />
                  Bulk Upload {sub.label}
                </motion.button>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <motion.div
      variants={bounceIn}
      whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <motion.div
        className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', bg)}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
      >
        <Icon className={cn('h-5 w-5', color)} />
      </motion.div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}
