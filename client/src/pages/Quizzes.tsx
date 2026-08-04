import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getQuizzes } from '../services/api';
import { cn } from '../utils';
import { fadeUp, stagger } from '../utils/animations';
import {
  BookOpen, Clock, ListChecks, Play, Loader2, Trophy,
  FileQuestion, ClipboardList
} from 'lucide-react';

interface QuizListItem {
  _id: string;
  title: string;
  description?: string;
  difficulty?: string;
  timeLimit?: number;
  documentId?: string;
  isActive?: boolean;
  questions?: Array<{ _id?: string; id?: string }>;
  createdBy?: { _id?: string; name?: string; email?: string } | string;
}

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  intermediate: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  expert: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
};

export default function Quizzes() {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getQuizzes()
      .then((res) => setQuizzes((res.quizzes || []).filter((q) => q.questions && q.questions.length > 0)))
      .catch((err) => {
        console.error(err);
        setError('Failed to load quizzes. Please try again.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
          <p className="text-sm text-slate-500">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mb-8 flex items-center gap-3"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/10">
            <ClipboardList className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Quizzes</h1>
            <p className="text-sm text-slate-500">Uploaded quizzes ready for you to take</p>
          </div>
        </motion.div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800/50 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </div>
        )}

        {quizzes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"
          >
            <FileQuestion className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              No quizzes available yet
            </p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Quizzes uploaded by your teacher will appear here.
            </p>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-4"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {quizzes.map((quiz, i) => {
              const questionCount = quiz.questions?.length ?? 0;
              const creatorName = typeof quiz.createdBy === 'object' ? quiz.createdBy?.name : undefined;
              return (
                <motion.div
                  key={quiz._id}
                  variants={fadeUp}
                  custom={i}
                  className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                    <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{quiz.title}</h3>
                      {quiz.difficulty && (
                        <span className={cn('rounded-lg px-2 py-0.5 text-xs font-medium capitalize', DIFFICULTY_STYLE[quiz.difficulty] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400')}>
                          {quiz.difficulty}
                        </span>
                      )}
                    </div>
                    {quiz.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{quiz.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <ListChecks className="h-3.5 w-3.5" /> {questionCount} question{questionCount !== 1 ? 's' : ''}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {Math.floor((quiz.timeLimit ?? 0) / 60)} min
                      </span>
                      {creatorName && (
                        <span className="flex items-center gap-1.5">
                          <Trophy className="h-3.5 w-3.5" /> {creatorName}
                        </span>
                      )}
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/quiz/${quiz._id}`)}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                  >
                    <Play className="h-4 w-4" /> Start Quiz
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
