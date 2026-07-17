import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getQuestions, deleteQuestion, approveQuestion, createQuestion, getDocuments } from '../services/api';
import {
  cn,
} from '../utils';
import {
  CheckCircle2, XCircle, Trash2, Search, CheckSquare, BookOpen,
  Plus, Minus, ChevronDown, ChevronUp, Filter, Loader2, AlertCircle,
  CircleDot, ToggleLeft, FileText,
} from 'lucide-react';
import { fadeUp, scaleIn, slideUp, stagger, bounceIn } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import type { Question, UploadedDocument, Difficulty } from '../types';

export default function AdminQuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'multiple-choice' | 'true-false'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | Difficulty>('all');
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

  const [formQuestion, setFormQuestion] = useState('');
  const [formType, setFormType] = useState<'multiple-choice' | 'true-false'>('multiple-choice');
  const [formOptions, setFormOptions] = useState(['', '', '', '']);
  const [formCorrectAnswer, setFormCorrectAnswer] = useState('A');
  const [formExplanation, setFormExplanation] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>('intermediate');
  const [formTopic, setFormTopic] = useState('');
  const [formDocumentId, setFormDocumentId] = useState('');
  const [formAutoApprove, setFormAutoApprove] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getQuestions(), getDocuments()])
      .then(([qRes, dRes]) => {
        setQuestions(qRes.questions);
        setDocuments(dRes.documents);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    await approveQuestion(id);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question?')) return;
    await deleteQuestion(id);
    load();
  };

  const handleBulkApprove = async () => {
    const pendingIds = Array.from(selectedQuestions).filter((id) => {
      const q = questions.find((qq) => qq._id === id);
      return q && !q.approved;
    });
    if (pendingIds.length === 0) return;
    await Promise.all(pendingIds.map((id) => approveQuestion(id)));
    setSelectedQuestions(new Set());
    load();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedQuestions.size} selected questions?`)) return;
    await Promise.all(Array.from(selectedQuestions).map((id) => deleteQuestion(id)));
    setSelectedQuestions(new Set());
    load();
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.size === filtered.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(filtered.map((q) => q._id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateQuestion = async () => {
    if (!formQuestion.trim()) { alert('Please enter a question.'); return; }
    if (formType === 'multiple-choice' && formOptions.some((o) => !o.trim())) {
      alert('Please fill in all 4 options.');
      return;
    }
    setSubmitting(true);
    try {
      const options = formType === 'multiple-choice' ? formOptions : undefined;
      const correctAnswer = formType === 'true-false' ? formCorrectAnswer === 'True' : formCorrectAnswer;
      await createQuestion({
        documentId: formDocumentId || (documents[0]?.id ?? ''),
        question: formQuestion,
        type: formType,
        options,
        correctAnswer,
        explanation: formExplanation,
        difficulty: formDifficulty,
        topic: formTopic,
      });
      setFormQuestion('');
      setFormOptions(['', '', '', '']);
      setFormCorrectAnswer('A');
      setFormExplanation('');
      setFormTopic('');
      setFormDocumentId('');
      setShowCreateForm(false);
      load();
    } catch (err) {
      console.error(err);
      alert('Failed to create question.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (filter === 'pending' && q.approved) return false;
      if (filter === 'approved' && !q.approved) return false;
      if (typeFilter !== 'all' && q.type !== typeFilter) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (search && !q.question.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [questions, filter, typeFilter, difficultyFilter, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <AnimatedSpinner label="Loading questions..." />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <motion.div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Question Bank</h1>
          <motion.span
            className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
            key={questions.length}
            initial={{ scale: 1.3 }}
            animate={{ scale: 1 }}
          >
            {questions.length}
          </motion.span>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
        >
          {showCreateForm ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showCreateForm ? 'Close Form' : 'Create Question'}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                <CircleDot className="h-4 w-4 text-indigo-500" />
                Create New Question
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Question Text</label>
                  <textarea
                    value={formQuestion}
                    onChange={(e) => setFormQuestion(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
                    placeholder="Enter the question..."
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Question Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['multiple-choice', 'true-false'] as const).map((t) => (
                      <motion.button
                        key={t}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setFormType(t); setFormCorrectAnswer(t === 'true-false' ? 'True' : 'A'); }}
                        className={cn(
                          'rounded-lg border-2 px-3 py-2 text-sm font-medium transition',
                          formType === t
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                        )}
                      >
                        {t === 'multiple-choice' ? 'MCQ' : 'True / False'}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Difficulty</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['beginner', 'intermediate', 'expert'] as const).map((d) => (
                      <motion.button
                        key={d}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setFormDifficulty(d)}
                        className={cn(
                          'rounded-lg border-2 px-3 py-2 text-sm font-medium transition',
                          formDifficulty === d
                            ? d === 'beginner' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : d === 'intermediate' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                        )}
                      >
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {formType === 'multiple-choice' && (
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Options & Correct Answer</label>
                    <div className="space-y-2">
                      {formOptions.map((opt, i) => {
                        const letter = String.fromCharCode(65 + i);
                        return (
                          <div key={i} className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setFormCorrectAnswer(letter)}
                              className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition',
                                formCorrectAnswer === letter
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                              )}
                              title="Mark as correct"
                            >
                              {letter}
                            </motion.button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...formOptions];
                                newOpts[i] = e.target.value;
                                setFormOptions(newOpts);
                              }}
                              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
                              placeholder={`Option ${letter}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formType === 'true-false' && (
                  <div>
                    <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Correct Answer</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['True', 'False'].map((val) => (
                        <motion.button
                          key={val}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFormCorrectAnswer(val)}
                          className={cn(
                            'rounded-lg border-2 px-3 py-2 text-sm font-medium transition',
                            formCorrectAnswer === val
                              ? val === 'True'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                          )}
                        >
                          {val}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Topic</label>
                  <input
                    type="text"
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
                    placeholder="e.g. Cell Biology"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Document (optional)</label>
                  <select
                    value={formDocumentId}
                    onChange={(e) => setFormDocumentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">No document</option>
                    {documents.filter((d) => d.status === 'ready').map((doc) => (
                      <option key={doc.id} value={doc.id}>{doc.originalName}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm text-slate-600 dark:text-slate-400">Explanation</label>
                  <textarea
                    value={formExplanation}
                    onChange={(e) => setFormExplanation(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
                    placeholder="Optional explanation for the answer..."
                  />
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-600 dark:text-slate-400">Auto-approve</label>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFormAutoApprove(!formAutoApprove)}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      formAutoApprove ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                    )}
                  >
                    <motion.div
                      className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                      animate={{ left: formAutoApprove ? '22px' : '2px' }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </motion.button>
                </div>

                <div className="flex items-end justify-end sm:col-span-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateQuestion}
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {submitting ? 'Creating...' : 'Create Question'}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="mb-6 flex flex-wrap items-center gap-3"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <motion.button
              key={f}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium transition',
                filter === f
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : 'Approved'}
            </motion.button>
          ))}
          <div className="w-px bg-slate-200 dark:bg-slate-700" />
          {(['all', 'multiple-choice', 'true-false'] as const).map((f) => (
            <motion.button
              key={f}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTypeFilter(f)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium transition',
                typeFilter === f
                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {f === 'all' ? 'All Types' : f === 'multiple-choice' ? 'MCQ' : 'T/F'}
            </motion.button>
          ))}
          <div className="w-px bg-slate-200 dark:bg-slate-700" />
          {(['all', 'beginner', 'intermediate', 'expert'] as const).map((f) => (
            <motion.button
              key={f}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setDifficultyFilter(f)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium transition',
                difficultyFilter === f
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              )}
            >
              {f === 'all' ? 'All Diff.' : f.charAt(0).toUpperCase() + f.slice(1)}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {selectedQuestions.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-500/20 dark:bg-indigo-500/5"
        >
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-400">
            {selectedQuestions.size} selected
          </span>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleBulkApprove}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
          >
            <CheckSquare className="h-3 w-3" /> Approve Selected
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600"
          >
            <Trash2 className="h-3 w-3" /> Delete Selected
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedQuestions(new Set())}
            className="ml-auto text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400"
          >
            Clear
          </motion.button>
        </motion.div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          <div className={cn(
            'flex h-4 w-4 items-center justify-center rounded border transition',
            selectedQuestions.size === filtered.length && filtered.length > 0
              ? 'border-indigo-500 bg-indigo-500 text-white'
              : 'border-slate-300 dark:border-slate-600'
          )}>
            {selectedQuestions.size === filtered.length && filtered.length > 0 && <CheckCircle2 className="h-3 w-3" />}
          </div>
          Select all ({filtered.length})
        </button>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((q, i) => (
            <motion.div
              key={q._id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.25, delay: i * 0.02 }}
              className={cn(
                'flex items-start gap-4 rounded-xl border bg-white p-4 transition-all dark:bg-slate-900',
                selectedQuestions.has(q._id)
                  ? 'border-indigo-300 ring-1 ring-indigo-500/10 dark:border-indigo-500/30'
                  : 'border-slate-200 dark:border-slate-800'
              )}
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleSelect(q._id)}
                className={cn(
                  'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition',
                  selectedQuestions.has(q._id)
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : 'border-slate-300 dark:border-slate-600'
                )}
              >
                {selectedQuestions.has(q._id) && <CheckCircle2 className="h-3 w-3" />}
              </motion.button>

              <motion.div
                className={cn(
                  'mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
                  q.type === 'multiple-choice' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                )}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <span className="text-xs font-bold">{q.type === 'multiple-choice' ? 'M' : 'T'}</span>
              </motion.div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-white">{q.question}</p>
                {q.type === 'multiple-choice' && q.options && (
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, oi) => (
                      <p key={oi} className={cn(
                        'text-xs',
                        opt === q.correctAnswer || String.fromCharCode(65 + oi) === q.correctAnswer
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 dark:text-slate-400'
                      )}>
                        {String.fromCharCode(65 + oi)}. {opt}
                      </p>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 dark:text-slate-500">{q.topic}</span>
                  <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    q.difficulty === 'beginner' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                      : q.difficulty === 'intermediate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                  )}>
                    {q.difficulty}
                  </span>
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-medium',
                    q.approved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                  )}>
                    {q.approved ? 'Approved' : 'Pending'}
                  </span>
                </div>
                {q.explanation && (
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 italic line-clamp-1">
                    {q.explanation}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {!q.approved && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleApprove(q._id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-500 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                    title="Approve"
                  >
                    <CheckSquare className="h-4 w-4" />
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDelete(q._id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"
          >
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              {search || filter !== 'all' || typeFilter !== 'all' || difficultyFilter !== 'all'
                ? 'No questions match your filters.'
                : 'No questions yet.'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {search || filter !== 'all' || typeFilter !== 'all' || difficultyFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Create a question or generate from a document.'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
