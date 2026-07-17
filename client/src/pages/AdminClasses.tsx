import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, GraduationCap, BarChart3, ArrowRight,
  Layers, Trophy, TrendingUp,
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

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  beginner: 'bg-emerald-500',
  intermediate: 'bg-amber-500',
  expert: 'bg-rose-500',
};

export default function AdminClasses() {
  const classData = useMemo(() => {
    return CLASS_KEYS.map((cls) => {
      const subjectBreakdown = SUBJECT_KEYS.map((sub) => ({
        id: sub,
        ...SUBJECT_META[sub],
        count: getSubjectQuestionCount(cls, sub),
      }));

      const totalQuestions = subjectBreakdown.reduce((sum, s) => sum + s.count, 0);

      const difficultyBreakdown = DIFFICULTIES.map((d) => ({
        level: d,
        count: subjectBreakdown.reduce(
          (sum, s) => sum + getSubjectQuestionCount(cls, s.id, d),
          0
        ),
      }));

      return {
        key: cls,
        ...CLASS_META[cls],
        subjects: subjectBreakdown,
        totalQuestions,
        difficultyBreakdown,
      };
    });
  }, []);

  const aggregate = useMemo(() => {
    const totalQuestions = classData.reduce((sum, c) => sum + c.totalQuestions, 0);
    const diffAgg = DIFFICULTIES.map((d) => ({
      level: d,
      count: classData.reduce((sum, c) => {
        const found = c.difficultyBreakdown.find((db) => db.level === d);
        return sum + (found?.count ?? 0);
      }, 0),
    }));
    return { totalClasses: CLASS_KEYS.length, totalQuestions, diffAgg };
  }, [classData]);

  const maxSubjectCount = Math.max(
    ...classData.flatMap((c) => c.subjects.map((s) => s.count)),
    1
  );

  return (
    <div className="p-4 sm:p-6">
      <motion.div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manage Classes</h1>
          <GraduationCap className="hidden h-6 w-6 text-indigo-500 sm:block" />
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
          value={aggregate.totalClasses}
          label="Total Classes"
          color="text-indigo-500"
          bg="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <StatCard
          icon={BookOpen}
          value={aggregate.totalQuestions}
          label="Total Questions"
          color="text-violet-500"
          bg="bg-violet-50 dark:bg-violet-500/10"
        />
        {aggregate.diffAgg.map((d) => (
          <StatCard
            key={d.level}
            icon={TrendingUp}
            value={d.count}
            label={`${d.level.charAt(0).toUpperCase() + d.level.slice(1)}`}
            color={d.level === 'beginner' ? 'text-emerald-500' : d.level === 'intermediate' ? 'text-amber-500' : 'text-rose-500'}
            bg={d.level === 'beginner' ? 'bg-emerald-50 dark:bg-emerald-500/10' : d.level === 'intermediate' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-rose-50 dark:bg-rose-500/10'}
          />
        ))}
      </motion.div>

      <motion.div
        className="space-y-6"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {classData.map((cls, idx) => (
          <motion.div
            key={cls.key}
            variants={slideUp}
            className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <motion.div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl shadow-lg shadow-indigo-500/20"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, delay: idx * 0.1 }}
                >
                  {cls.icon}
                </motion.div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{cls.label}</h2>
                  <p className="mt-1 max-w-lg text-sm text-slate-500 dark:text-slate-400">{cls.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <BookOpen className="h-3 w-3" />
                      {SUBJECT_KEYS.length} Subjects
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600 dark:bg-violet-500/10 dark:text-violet-400">
                      <BarChart3 className="h-3 w-3" />
                      {cls.totalQuestions} Questions
                    </span>
                  </div>
                </div>
              </div>
              <Link to={`/admin/question-bank?class=${cls.key}`}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
                >
                  View Questions
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </Link>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-3">
              {cls.difficultyBreakdown.map((d) => (
                <div
                  key={d.level}
                  className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-800/50"
                >
                  <div className={cn('mx-auto mb-1.5 h-2 w-8 rounded-full', DIFFICULTY_COLORS[d.level])} />
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{d.count}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {d.level}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Subject Breakdown
              </h3>
              <div className="space-y-2.5">
                {cls.subjects.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-3">
                    <span className="w-5 text-center text-base">{sub.icon}</span>
                    <span className="w-40 shrink-0 truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                      {sub.label}
                    </span>
                    <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        className={cn(
                          'absolute inset-y-0 left-0 rounded-full',
                          sub.count > 0 ? 'bg-gradient-to-r from-indigo-500 to-violet-500' : 'bg-slate-200 dark:bg-slate-700'
                        )}
                        initial={{ width: '0%' }}
                        animate={{ width: `${(sub.count / maxSubjectCount) * 100}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-bold text-slate-600 dark:text-slate-400">
                      {sub.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
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
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}
