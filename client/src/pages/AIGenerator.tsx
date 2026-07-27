import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import {
  getAIGenerationStatus, generateQuestionsAI, saveAIGeneratedQuestions,
} from '../services/api';
import {
  Upload, Sparkles, FileText, Check, AlertCircle, RotateCcw,
  Save, ChevronDown, ChevronUp, Brain, Zap, Clock, Crown,
  BookOpen, X, Loader2,
} from 'lucide-react';
import { fadeUp, stagger } from '../utils/animations';
import { SUBJECT_META, type SubjectId } from '../data/questionBank';
import AnimatedSpinner from '../components/AnimatedSpinner';
import type { AIGeneratedQuestion } from '../types';

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/csv', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 20 * 1024 * 1024;
const SUBJECT_OPTIONS: SubjectId[] = ['mathematics', 'science', 'english', 'social-studies', 'ict', 'rme', 'creative-arts', 'career-tech'];

type Step = 'upload' | 'configure' | 'generating' | 'results';

export default function AIGenerator() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [subject, setSubject] = useState<SubjectId>('mathematics');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [count, setCount] = useState(10);
  const [generatedQuestions, setGeneratedQuestions] = useState<AIGeneratedQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usage, setUsage] = useState({ used: 0, limit: 20, month: '' });
  const [plan, setPlan] = useState('free');
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  useEffect(() => {
    getAIGenerationStatus()
      .then((res) => { setUsage({ used: res.used, limit: res.limit, month: res.month }); setPlan(res.plan); })
      .catch(() => {});
  }, []);

  const remaining = usage.limit === -1 ? Infinity : Math.max(0, usage.limit - usage.used);

  const handleFile = (f: File) => {
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.endsWith('.txt') && !f.name.endsWith('.csv')) {
      setError('Unsupported file type. Upload PDF, DOCX, TXT, CSV, JPG, or PNG.');
      return;
    }
    if (f.size > MAX_SIZE) {
      setError('File too large. Maximum size is 20MB.');
      return;
    }
    setFile(f);
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const processFile = async () => {
    if (!file) return;
    setStep('generating');
    setError('');

    try {
      const textContent = await file.text();
      setExtractedText(textContent);
      setStep('configure');
    } catch {
      setError('Failed to read file. Please try again.');
      setStep('upload');
    }
  };

  const handleGenerate = async () => {
    if (!extractedText || remaining === 0) return;
    setStep('generating');
    setError('');

    try {
      const result = await generateQuestionsAI({
        text: extractedText,
        subject: SUBJECT_META[subject].label,
        difficulty,
        count: Math.min(count, remaining === Infinity ? 50 : remaining),
      });
      setGeneratedQuestions(result.questions);
      setUsage({ used: result.usage.used, limit: result.usage.limit, month: result.usage.month });
      setStep('results');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message
        : 'Generation failed';
      setError(msg || 'AI generation failed. Please try again.');
      setStep('configure');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveAIGeneratedQuestions({ questions: generatedQuestions });
      setSaved(true);
    } catch {
      setError('Failed to save questions');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setFile(null);
    setExtractedText('');
    setGeneratedQuestions([]);
    setSaved(false);
    setError('');
    setExpandedQ(null);
    setStep('upload');
  };

  const planBadge = plan === 'premium' ? { label: 'Premium', color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400', icon: Crown }
    : plan === 'basic' ? { label: 'Basic', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400', icon: Zap }
    : { label: 'Free Trial', color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400', icon: Brain };

  return (
    <div className="p-4 sm:p-6">
      <motion.div className="mb-6" variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Question Generator</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${planBadge.color}`}>
            <planBadge.icon className="h-3 w-3" /> {planBadge.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload study materials and let AI generate exam questions.</p>
      </motion.div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {usage.used} / {usage.limit === -1 ? '∞' : usage.limit} used
          </span>
        </div>
        {remaining !== Infinity && (
          <span className="text-xs text-slate-500 dark:text-slate-400">{remaining} remaining this month</span>
        )}
      </div>

      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mx-auto max-w-2xl">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition ${
                dragOver ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/10' : 'border-slate-300 hover:border-indigo-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-indigo-600 dark:hover:bg-slate-800/50'
              }`}
            >
              <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.docx,.doc,.txt,.csv,.jpg,.jpeg,.png,.webp" onChange={handleFileInput} />
              <Upload className="mx-auto mb-4 h-12 w-12 text-slate-400" />
              <p className="text-lg font-semibold text-slate-700 dark:text-white">
                {file ? file.name : 'Drop your study material here'}
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                or click to browse. PDF, DOCX, TXT, CSV, Images (max 20MB)
              </p>
            </div>

            {file && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-indigo-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button onClick={processFile} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  Process File
                </button>
              </motion.div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Brain, title: 'AI-Powered', desc: 'Advanced AI analyzes your content and generates relevant questions' },
                { icon: Clock, title: 'Instant Results', desc: 'Get bulk questions generated in seconds with explanations' },
                { icon: BookOpen, title: 'Exam Ready', desc: 'Questions categorized by difficulty: Beginner, Intermediate, Expert' },
              ].map((f) => (
                <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <f.icon className="mb-2 h-6 w-6 text-indigo-500" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{f.title}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{f.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'configure' && (
          <motion.div key="configure" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mx-auto max-w-2xl">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">Configure Generation</h2>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Subject</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value as SubjectId)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                  {SUBJECT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{SUBJECT_META[s].icon} {SUBJECT_META[s].label}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {['beginner', 'intermediate', 'expert'].map((d) => (
                    <button key={d} onClick={() => setDifficulty(d)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                        difficulty === d ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-500/15 dark:text-indigo-300'
                          : 'border-slate-200 hover:border-indigo-300 dark:border-slate-700 dark:hover:border-indigo-600'
                      }`}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Number of Questions (max {remaining === Infinity ? 50 : remaining})
                </label>
                <input type="number" value={count} min={1} max={Math.min(50, remaining === Infinity ? 50 : remaining)}
                  onChange={(e) => setCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('upload')} className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  Back
                </button>
                <button onClick={handleGenerate} disabled={remaining === 0}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50">
                  <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4" /> Generate Questions</span>
                </button>
              </div>

              {remaining === 0 && (
                <p className="mt-3 text-center text-xs text-rose-500">
                  You've reached your monthly AI limit. <a href="/subscription" className="font-medium underline">Upgrade your plan</a> for more.
                </p>
              )}
            </div>
          </motion.div>
        )}

        {step === 'generating' && (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-[40vh] items-center justify-center">
            <AnimatedSpinner label="Generating questions with AI..." />
          </motion.div>
        )}

        {step === 'results' && (
          <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {generatedQuestions.length} Questions Generated
              </h2>
              <div className="flex gap-2">
                {!saved && (
                  <button onClick={handleSave} disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? 'Saving...' : 'Save to Question Bank'}
                  </button>
                )}
                <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                  <RotateCcw className="h-4 w-4" /> New Upload
                </button>
              </div>
            </div>

            {saved && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Check className="h-4 w-4" /> Questions saved to your question bank!
              </div>
            )}

            <div className="space-y-3">
              {generatedQuestions.map((q, i) => {
                const expanded = expandedQ === i;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{i + 1}. {q.question}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{q.subject}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            q.difficulty === 'beginner' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                              : q.difficulty === 'expert' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                          }`}>{q.difficulty}</span>
                        </div>
                      </div>
                      <button onClick={() => setExpandedQ(expanded ? null : i)} className="shrink-0 p-1 text-slate-400 hover:text-slate-600">
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {expanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                        {q.options.map((opt, j) => {
                          const letter = String.fromCharCode(65 + j);
                          const isCorrect = letter === q.correctAnswer;
                          return (
                            <div key={j} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                              isCorrect ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-400'
                            }`}>
                              <span className="font-semibold">{letter}.</span> {opt}
                              {isCorrect && <Check className="ml-auto h-4 w-4 text-emerald-500" />}
                            </div>
                          );
                        })}
                        {q.explanation && (
                          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <p className="font-semibold text-slate-700 dark:text-slate-300">Explanation:</p> {q.explanation}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
