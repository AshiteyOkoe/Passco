import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getDocuments, getQuestions, createQuiz } from '../services/api';
import { cn } from '../utils';
import { PlusCircle, Loader2, CheckCircle2, ArrowRight, Library } from 'lucide-react';
import { fadeUp, scaleIn, slideUp, stagger } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import type { UploadedDocument, Question } from '../types';

export default function AdminCreateQuiz() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const [timeLimit, setTimeLimit] = useState(600);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [documentFilter, setDocumentFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([getDocuments(), getQuestions({})])
      .then(([docsRes, qRes]) => {
        setDocuments(docsRes.documents);
        setQuestions(qRes.questions.filter(q => q.approved));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleQuestion = (id: string) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredQuestions = documentFilter === 'all'
    ? questions
    : questions.filter((q) => q.documentId === documentFilter);

  const handleCreate = async () => {
    if (!title.trim()) { alert('Please enter a quiz title.'); return; }
    if (selectedQuestions.size === 0) { alert('Please select at least one question.'); return; }
    setSubmitting(true);
    try {
      await createQuiz({
        title,
        description,
        difficulty,
        timeLimit,
        questions: Array.from(selectedQuestions),
      });
      navigate('/admin');
    } catch (err) {
      console.error(err);
      alert('Failed to create quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><AnimatedSpinner label="Loading..." /></div>;

  return (
    <div className="p-6">
      <motion.div className="mb-6 flex items-center gap-2" variants={fadeUp} initial="hidden" animate="visible">
        <Library className="h-6 w-6 text-indigo-500" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Quiz</h1>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div className="space-y-4" variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={slideUp} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-white">Quiz Details</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="e.g. Cell Biology Quiz" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Optional description" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['beginner', 'intermediate', 'expert'] as const).map((d) => (
                    <motion.button
                      key={d}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setDifficulty(d)}
                      className={cn('rounded-lg border-2 px-3 py-2 text-sm font-medium transition', difficulty === d
                        ? d === 'beginner' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : d === 'intermediate' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400')}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Time Limit (seconds)</label>
                <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} min={60} max={3600}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
            </div>
          </motion.div>

          <motion.div variants={slideUp} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Selected Questions</h2>
              <motion.span
                className="text-sm text-indigo-600 font-semibold"
                key={selectedQuestions.size}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {selectedQuestions.size}
              </motion.span>
            </div>
            <AnimatePresence>
              {Array.from(selectedQuestions).slice(0, 5).map((id) => {
                const q = questions.find((qq) => qq._id === id);
                return q ? (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="mb-2 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/50"
                  >
                    <p className="text-slate-700 dark:text-slate-300 line-clamp-1">{q.question}</p>
                  </motion.div>
                ) : null;
              })}
            </AnimatePresence>
            {selectedQuestions.size > 5 && (
              <p className="text-xs text-slate-400">...and {selectedQuestions.size - 5} more</p>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={submitting || selectedQuestions.size === 0}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : <><PlusCircle className="h-4 w-4" /> Create Quiz</>}
            </motion.button>
          </motion.div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Question Bank</h2>
            <select value={documentFilter} onChange={(e) => setDocumentFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              <option value="all">All Documents</option>
              {documents.filter(d => d.status === 'ready').map((doc) => (
                <option key={doc.id} value={doc.id}>{doc.originalName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            <AnimatePresence>
              {filteredQuestions.map((q) => (
                <motion.button
                  key={q._id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => toggleQuestion(q._id)}
                  className={cn('flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition', selectedQuestions.has(q._id) ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/5' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600')}
                >
                  <motion.div
                    className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition', selectedQuestions.has(q._id) ? 'border-indigo-500 bg-indigo-500 text-white' : 'border-slate-300 text-transparent dark:border-slate-600')}
                    animate={selectedQuestions.has(q._id) ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {selectedQuestions.has(q._id) && <CheckCircle2 className="h-3 w-3" />}
                  </motion.div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white line-clamp-2">{q.question}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-slate-400">{q.type === 'multiple-choice' ? 'MCQ' : 'T/F'}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{q.topic}</span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            {filteredQuestions.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No approved questions available.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
