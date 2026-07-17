import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Trash2,
  Edit3, X, ChevronDown, ChevronUp, AlertTriangle, Search,
  Filter, Check, BookOpen, GraduationCap, BarChart3, ArrowRight,
  FileUp, Brain, Sparkles, CheckSquare, Square, RotateCcw, Lock,
} from 'lucide-react';
import {
  extractQuestionsFromText, readFileAsText, isTextBasedFile, isServerParsedFile,
  isImageFile, getSubjectLabel, getClassLabel, getDifficultyLabel,
  type ExtractedQuestion, type SubjectId, type JHSCategory, type DifficultyLevel, type QuestionType,
} from '../utils/questionExtractor';
import api from '../services/api';
import { cn } from '../utils';
import { fadeUp, stagger, bounceIn } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';

type Step = 'upload' | 'processing' | 'preview';

const ALL_SUBJECTS: SubjectId[] = [
  'mathematics', 'science', 'english', 'social-studies', 'ict', 'rme', 'creative-arts', 'career-tech',
];
const ALL_CLASSES: JHSCategory[] = ['jhs1', 'jhs2', 'jhs3'];
const ALL_DIFFICULTIES: DifficultyLevel[] = ['beginner', 'intermediate', 'expert'];
const ALL_TYPES: QuestionType[] = ['multiple-choice', 'true-false'];

export default function AdminBulkUpload() {
  const [searchParams] = useSearchParams();
  const presetSubject = searchParams.get('subject') as SubjectId | null;
  const presetClass = searchParams.get('class') as JHSCategory | null;

  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [processingMsg, setProcessingMsg] = useState('');
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<ExtractedQuestion | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterSubject, setFilterSubject] = useState<string>(presetSubject || 'all');
  const [filterClass, setFilterClass] = useState<string>(presetClass || 'all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [saveResult, setSaveResult] = useState<{ count: number; subjectBreakdown: Record<string, number> } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [savingMsg, setSavingMsg] = useState('');
  const [targetSubject, setTargetSubject] = useState<SubjectId | ''>(presetSubject || '');
  const [targetClass, setTargetClass] = useState<JHSCategory | ''>(presetClass || '');
  const [targetDifficulty, setTargetDifficulty] = useState<DifficultyLevel | ''>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (filterSubject !== 'all' && q.subject !== filterSubject) return false;
      if (filterClass !== 'all' && q.classLevel !== filterClass) return false;
      if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
      if (filterStatus !== 'all' && q.status !== filterStatus) return false;
      if (searchQuery && !q.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [questions, filterSubject, filterClass, filterDifficulty, filterStatus, searchQuery]);

  const stats = useMemo(() => {
    const subjects: Record<string, number> = {};
    const classes: Record<string, number> = {};
    const difficulties: Record<string, number> = {};
    const types: Record<string, number> = { 'multiple-choice': 0, 'true-false': 0 };
    let approved = 0;
    for (const q of questions) {
      subjects[q.subject] = (subjects[q.subject] || 0) + 1;
      classes[q.classLevel] = (classes[q.classLevel] || 0) + 1;
      difficulties[q.difficulty] = (difficulties[q.difficulty] || 0) + 1;
      types[q.type] = (types[q.type] || 0) + 1;
      if (q.status === 'approved') approved++;
    }
    return { subjects, classes, difficulties, types, approved, total: questions.length };
  }, [questions]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  }, []);

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setStep('processing');
    setErrorMsg('');
    setQuestions([]);

    const applyPreset = (qs: ExtractedQuestion[]) => {
      return qs.map(q => ({
        ...q,
        subject: (targetSubject || presetSubject || '') as SubjectId || q.subject,
        classLevel: (targetClass || presetClass || '') as JHSCategory || q.classLevel,
        difficulty: (targetDifficulty || '') as DifficultyLevel || q.difficulty,
        status: (targetSubject || presetSubject || targetClass || presetClass || targetDifficulty) ? 'approved' as const : q.status,
      }));
    };

    try {
      if (isTextBasedFile(selectedFile.name)) {
        setProcessingMsg('Reading file...');
        const text = await readFileAsText(selectedFile);
        setProcessingMsg('AI analyzing content...');
        await new Promise(r => setTimeout(r, 500));
        const extracted = applyPreset(extractQuestionsFromText(text));
        if (extracted.length === 0) {
          setErrorMsg('No questions could be extracted from this file. Please ensure the file contains properly formatted questions.');
          setStep('upload');
          return;
        }
        setQuestions(extracted);
        setStep('preview');
      } else if (isServerParsedFile(selectedFile.name) || isImageFile(selectedFile.name)) {
        setProcessingMsg('Uploading to server for AI processing...');
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await api.post('/bulk-upload/parse', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const { extractedText, bulkUploadId } = response.data;
        setProcessingMsg('AI extracting questions...');
        await new Promise(r => setTimeout(r, 300));

        const extracted = applyPreset(extractQuestionsFromText(extractedText));
        if (extracted.length === 0) {
          setErrorMsg('No questions could be extracted from this file. The AI parsed the document but could not identify question patterns.');
          setStep('upload');
          return;
        }

        const withBulkId = extracted.map(q => ({ ...q, bulkUploadId }));
        setQuestions(withBulkId);
        setStep('preview');
      } else {
        setErrorMsg(`Unsupported file format: ${selectedFile.name}. Please upload CSV, TXT, JSON, PDF, DOCX, XLSX, or image files.`);
        setStep('upload');
      }
    } catch (err) {
      console.error('File processing error:', err);
      setErrorMsg(`Failed to process file: ${(err as Error).message || 'Unknown error'}`);
      setStep('upload');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredQuestions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredQuestions.map(q => q.id)));
    }
  };

  const saveToBank = async (qs: ExtractedQuestion[]) => {
    const toSave = qs.filter(q => q.status === 'approved' || q.status === 'edited');
    if (toSave.length === 0) return;
    setSavingMsg(`Saving ${toSave.length} questions to bank...`);
    try {
      await api.post('/bulk-upload/save', {
        questions: toSave.map(q => ({
          question: q.question,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          subject: q.subject,
          classLevel: q.classLevel,
          difficulty: q.difficulty,
          topic: q.topic,
        })),
      });
      setSaveResult(prev => {
        const newCount = (prev?.count || 0) + toSave.length;
        const newBreakdown = { ...(prev?.subjectBreakdown || {}) };
        for (const q of toSave) {
          newBreakdown[q.subject] = (newBreakdown[q.subject] || 0) + 1;
        }
        return { count: newCount, subjectBreakdown: newBreakdown };
      });
      setSavingMsg('');
    } catch {
      setSavingMsg('');
      setErrorMsg('Failed to save some questions to bank. They remain in preview.');
    }
  };

  const approveSelected = async () => {
    const selected = questions.filter(q => selectedIds.has(q.id));
    setQuestions(prev => prev.map(q =>
      selectedIds.has(q.id) ? { ...q, status: 'approved' as const } : q
    ));
    setSelectedIds(new Set());
    await saveToBank(selected.map(q => ({ ...q, status: 'approved' as const })));
  };

  const approveAll = async () => {
    const pending = questions.filter(q => q.status === 'pending');
    setQuestions(prev => prev.map(q => ({ ...q, status: 'approved' as const })));
    await saveToBank(pending.map(q => ({ ...q, status: 'approved' as const })));
  };

  const deleteSelected = () => {
    setQuestions(prev => prev.filter(q => !selectedIds.has(q.id)));
    setSelectedIds(new Set());
    setEditIdx(null);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (editIdx !== null && questions[editIdx]?.id === id) {
      setEditIdx(null);
      setEditData(null);
    }
  };

  const startEdit = (idx: number) => {
    const actualIdx = questions.indexOf(filteredQuestions[idx]);
    setEditIdx(actualIdx);
    setEditData({ ...questions[actualIdx] });
  };

  const saveEdit = async () => {
    if (editIdx === null || !editData) return;
    const updated = { ...editData, status: 'edited' as const };
    setQuestions(prev => prev.map((q, i) => i === editIdx ? updated : q));
    setEditIdx(null);
    setEditData(null);
    await saveToBank([updated]);
  };

  const cancelEdit = () => {
    setEditIdx(null);
    setEditData(null);
  };

  const updateEditField = <K extends keyof ExtractedQuestion>(field: K, value: ExtractedQuestion[K]) => {
    if (!editData) return;
    setEditData({ ...editData, [field]: value });
  };

  const reset = () => {
    setStep('upload');
    setFile(null);
    setQuestions([]);
    setEditIdx(null);
    setEditData(null);
    setSelectedIds(new Set());
    setSaveResult(null);
    setErrorMsg('');
  };

  const getSubjectColor = (subject: SubjectId) => {
    const colors: Record<SubjectId, string> = {
      mathematics: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
      science: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
      english: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400',
      'social-studies': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
      ict: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400',
      rme: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
      'creative-arts': 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400',
      'career-tech': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
    };
    return colors[subject] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="p-4 sm:p-6">
      <motion.div className="mb-6" variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AI Bulk Question Upload</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Upload files and let AI extract, categorize, and populate questions</p>
          </div>
        </div>
      </motion.div>

      {/* Step Indicator */}
      <motion.div className="mb-6" variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { key: 'upload', label: 'Upload', icon: FileUp },
            { key: 'processing', label: 'Processing', icon: Loader2 },
            { key: 'preview', label: 'Preview, Approve & Save', icon: Eye },
          ].map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.key;
            const isDone = (step === 'preview' && i < 2);
            return (
              <React.Fragment key={s.key}>
                <div className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                  isActive ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' :
                  isDone ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                  'bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                )}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className={cn('h-4 w-4', step === 'processing' && s.key === 'processing' && 'animate-spin')} />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < 2 && <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </motion.div>

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
          <p className="text-sm text-rose-700 dark:text-rose-400">{errorMsg}</p>
          <button onClick={() => setErrorMsg('')} className="ml-auto text-rose-400 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* UPLOAD STEP */}
      {step === 'upload' && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-white">Target (Optional)</h3>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Select a subject and class to lock all uploaded questions to those values. Difficulty can be edited per-question during review.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  Subject {targetSubject && <motion.span animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity }}><Lock className="h-3 w-3 text-amber-500" /></motion.span>}
                </label>
                <select
                  value={targetSubject}
                  onChange={e => setTargetSubject(e.target.value as SubjectId | '')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Auto-detect</option>
                  {ALL_SUBJECTS.map(s => (
                    <option key={s} value={s}>{getSubjectLabel(s)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  Class {targetClass && <motion.span animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}><Lock className="h-3 w-3 text-amber-500" /></motion.span>}
                </label>
                <select
                  value={targetClass}
                  onChange={e => setTargetClass(e.target.value as JHSCategory | '')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Auto-detect</option>
                  {ALL_CLASSES.map(c => (
                    <option key={c} value={c}>{getClassLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Difficulty <span className="text-[10px] font-normal text-slate-400">(editable per question)</span></label>
                <select
                  value={targetDifficulty}
                  onChange={e => setTargetDifficulty(e.target.value as DifficultyLevel | '')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Auto-detect</option>
                  {ALL_DIFFICULTIES.map(d => (
                    <option key={d} value={d}>{getDifficultyLabel(d)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all',
              isDragging
                ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/50'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.json,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
            />
            <motion.div
              animate={isDragging ? { scale: 1.1, y: -5 } : { scale: [1, 1.03, 1], y: [0, -4, 0] }}
              transition={isDragging ? { duration: 0.2 } : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500"
            >
              <Upload className="h-8 w-8 text-white" />
            </motion.div>
            <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-white">
              {isDragging ? 'Drop your file here' : 'Upload Question File'}
            </h3>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              Drag and drop or click to browse
            </p>
            {(presetSubject || presetClass) && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-4 py-2 dark:bg-indigo-500/10">
                <BookOpen className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {presetClass && `Uploading for: ${getClassLabel(presetClass)}`}
                  {presetClass && presetSubject && ' — '}
                  {presetSubject && getSubjectLabel(presetSubject)}
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {['PDF', 'DOCX', 'XLSX', 'CSV', 'TXT', 'JSON', 'JPG', 'PNG'].map(ext => (
                <span key={ext} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  .{ext.toLowerCase()}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <FeatureCard
              icon={Brain}
              title="AI Extraction"
              desc="Automatically detects questions, answers, subjects, and difficulty levels"
              color="text-indigo-500"
              bg="bg-indigo-50 dark:bg-indigo-500/10"
            />
            <FeatureCard
              icon={Sparkles}
              title="Smart Categorization"
              desc="Auto-classifies by subject, class level (JHS 1-3), and difficulty"
              color="text-violet-500"
              bg="bg-violet-50 dark:bg-violet-500/10"
            />
            <FeatureCard
              icon={Eye}
              title="Preview & Edit"
              desc="Review all extracted questions, edit, approve, or delete before saving"
              color="text-emerald-500"
              bg="bg-emerald-50 dark:bg-emerald-500/10"
            />
          </div>
        </motion.div>
      )}

      {/* PROCESSING STEP */}
      {step === 'processing' && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="relative mb-6">
            <div className="h-20 w-20 rounded-full bg-indigo-50 dark:bg-indigo-500/10" />
            <Loader2 className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-spin text-indigo-500" />
          </div>
          <h3 className="mb-2 text-lg font-bold text-slate-800 dark:text-white">Processing File...</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{processingMsg}</p>
          {file && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 dark:bg-slate-800">
              <FileText className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-600 dark:text-slate-300">{file.name}</span>
              <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </motion.div>
      )}

      {/* PREVIEW STEP */}
      {step === 'preview' && (
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          {/* Stats Bar */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                Extraction Results
                <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                  {stats.total} questions
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{stats.approved} approved</span>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: stats.total > 0 ? `${(stats.approved / stats.total) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatMini label="Subjects" value={Object.keys(stats.subjects).length} icon={BookOpen} color="text-blue-500" />
              <StatMini label="MCQ" value={stats.types['multiple-choice'] || 0} icon={CheckSquare} color="text-violet-500" />
              <StatMini label="True/False" value={stats.types['true-false'] || 0} icon={Square} color="text-amber-500" />
              <StatMini label="Classes" value={Object.keys(stats.classes).length} icon={GraduationCap} color="text-emerald-500" />
            </div>

            {/* Subject Breakdown */}
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(stats.subjects).map(([subj, count]) => (
                <span key={subj} className={cn('rounded-lg px-2.5 py-1 text-xs font-semibold', getSubjectColor(subj as SubjectId))}>
                  {getSubjectLabel(subj as SubjectId)}: {count}
                </span>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={approveAll}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              <Check className="h-4 w-4" /> Approve All
            </button>
            <button
              onClick={approveSelected}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-40 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve Selected ({selectedIds.size})
            </button>
            <button
              onClick={deleteSelected}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-40 dark:bg-rose-500/10 dark:text-rose-400"
            >
              <Trash2 className="h-4 w-4" /> Delete Selected
            </button>
            <div className="ml-auto flex items-center gap-2">
              {savingMsg && (
                <span className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {savingMsg}
                </span>
              )}
              {saveResult && (
                <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {saveResult.count} saved to bank
                </span>
              )}
              <button
                onClick={reset}
                className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              >
                <RotateCcw className="h-4 w-4" /> New Upload
              </button>
              <a
                href="/admin/jhs-questions"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-violet-600"
              >
                <Eye className="h-4 w-4" /> View Question Bank
              </a>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              >
                <Filter className="h-3.5 w-3.5" /> Filters
                {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search questions..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none transition focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <span className="text-xs text-slate-400">{filteredQuestions.length}/{questions.length}</span>
            </div>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"
              >
                <FilterSelect label="Subject" value={filterSubject} onChange={setFilterSubject}
                  options={[{ value: 'all', label: 'All Subjects' }, ...ALL_SUBJECTS.map(s => ({ value: s, label: getSubjectLabel(s) }))]} />
                <FilterSelect label="Class" value={filterClass} onChange={setFilterClass}
                  options={[{ value: 'all', label: 'All Classes' }, ...ALL_CLASSES.map(c => ({ value: c, label: getClassLabel(c) }))]} />
                <FilterSelect label="Difficulty" value={filterDifficulty} onChange={setFilterDifficulty}
                  options={[{ value: 'all', label: 'All Levels' }, ...ALL_DIFFICULTIES.map(d => ({ value: d, label: getDifficultyLabel(d) }))]} />
                <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus}
                  options={[{ value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'edited', label: 'Edited' }]} />
              </motion.div>
            )}
          </div>

          {/* Select All */}
          <div className="mb-3 flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
            >
              {selectedIds.size === filteredQuestions.length && filteredQuestions.length > 0
                ? <CheckSquare className="h-3.5 w-3.5" />
                : <Square className="h-3.5 w-3.5" />
              }
              Select All
            </button>
          </div>

          {/* Question Cards */}
          <div className="space-y-3">
            <AnimatePresence>
              {filteredQuestions.map((q, idx) => {
                const isEditing = editIdx !== null && questions[editIdx]?.id === q.id;
                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.02 }}
                    className={cn(
                      'rounded-xl border bg-white p-4 transition-all dark:bg-slate-900',
                      q.status === 'approved' ? 'border-emerald-200 dark:border-emerald-500/30' :
                      q.status === 'edited' ? 'border-amber-200 dark:border-amber-500/30' :
                      isEditing ? 'border-indigo-300 ring-2 ring-indigo-500/20 dark:border-indigo-500/50' :
                      'border-slate-200 dark:border-slate-800'
                    )}
                  >
                    {isEditing && editData ? (
                      /* EDIT MODE */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-500">EDITING QUESTION</span>
                          <div className="flex gap-2">
                            <button onClick={saveEdit} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-600">
                              <Check className="h-3 w-3" /> Save
                            </button>
                            <button onClick={cancelEdit} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400">
                              <X className="h-3 w-3" /> Cancel
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={editData.question}
                          onChange={e => updateEditField('question', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          rows={2}
                        />
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <select value={editData.subject} onChange={e => updateEditField('subject', e.target.value as SubjectId)}
                            disabled={!!(targetSubject || presetSubject)}
                            className={cn("rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white",
                              (targetSubject || presetSubject) && "opacity-60 cursor-not-allowed")}>
                            {ALL_SUBJECTS.map(s => <option key={s} value={s}>{getSubjectLabel(s)}</option>)}
                          </select>
                          <select value={editData.classLevel} onChange={e => updateEditField('classLevel', e.target.value as JHSCategory)}
                            disabled={!!(targetClass || presetClass)}
                            className={cn("rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white",
                              (targetClass || presetClass) && "opacity-60 cursor-not-allowed")}>
                            {ALL_CLASSES.map(c => <option key={c} value={c}>{getClassLabel(c)}</option>)}
                          </select>
                          <select value={editData.difficulty} onChange={e => updateEditField('difficulty', e.target.value as DifficultyLevel)}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                            {ALL_DIFFICULTIES.map(d => <option key={d} value={d}>{getDifficultyLabel(d)}</option>)}
                          </select>
                          <select value={editData.type} onChange={e => {
                            const newType = e.target.value as QuestionType;
                            updateEditField('type', newType);
                            if (newType === 'true-false') {
                              updateEditField('options', []);
                              if (!['True', 'False'].includes(editData.correctAnswer)) {
                                updateEditField('correctAnswer', 'True');
                              }
                            } else if (editData.options.length < 4) {
                              updateEditField('options', ['', '', '', '']);
                            }
                          }}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                            <option value="multiple-choice">Multiple Choice</option>
                            <option value="true-false">True / False</option>
                          </select>
                        </div>
                        {editData.type === 'multiple-choice' && (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {editData.options.map((opt, oi) => (
                              <div key={oi} className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <input
                                  value={opt}
                                  onChange={e => {
                                    const newOpts = [...editData.options];
                                    newOpts[oi] = e.target.value;
                                    updateEditField('options', newOpts);
                                  }}
                                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Correct Answer</label>
                            {editData.type === 'multiple-choice' ? (
                              <select value={editData.correctAnswer} onChange={e => updateEditField('correctAnswer', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            ) : (
                              <select value={editData.correctAnswer} onChange={e => updateEditField('correctAnswer', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                <option value="True">True</option>
                                <option value="False">False</option>
                              </select>
                            )}
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">Explanation</label>
                            <input
                              value={editData.explanation}
                              onChange={e => updateEditField('explanation', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              placeholder="Explanation..."
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* VIEW MODE */
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(q.id)}
                            onChange={() => toggleSelect(q.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-400"
                          />
                          <motion.span
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: 0 }}
                            className={cn('rounded-lg px-2 py-0.5 text-[10px] font-bold', getSubjectColor(q.subject))}
                          >
                            {getSubjectLabel(q.subject)}
                          </motion.span>
                          <motion.span
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }}
                            className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          >
                            {getClassLabel(q.classLevel)}
                          </motion.span>
                          <motion.span
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: 0.4 }}
                            className={cn('rounded-lg px-2 py-0.5 text-[10px] font-semibold',
                              q.difficulty === 'beginner' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                              q.difficulty === 'expert' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                              'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                            )}>
                            {getDifficultyLabel(q.difficulty)}
                          </motion.span>
                          <motion.span
                            animate={{ y: [0, -3, 0] }}
                            transition={{ duration: 2.5, repeat: Infinity, delay: 0.6 }}
                            className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          >
                            {q.type === 'multiple-choice' ? 'MCQ' : 'T/F'}
                          </motion.span>
                          {q.status === 'approved' && (
                            <motion.span
                              animate={{ y: [0, -3, 0] }}
                              transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
                              className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            >
                              APPROVED
                            </motion.span>
                          )}
                          {q.status === 'edited' && (
                            <motion.span
                              animate={{ y: [0, -3, 0] }}
                              transition={{ duration: 2.5, repeat: Infinity, delay: 0.8 }}
                              className="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                            >
                              EDITED
                            </motion.span>
                          )}
                          <div className="ml-auto flex items-center gap-1">
                            <motion.button
                              whileHover={{ scale: 1.15, y: -2 }}
                              whileTap={{ scale: 0.9 }}
                              animate={{ y: [0, -2, 0] }}
                              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
                              onClick={() => startEdit(idx)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-500 dark:hover:bg-slate-800"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.15, y: -2 }}
                              whileTap={{ scale: 0.9 }}
                              animate={{ y: [0, -2, 0] }}
                              transition={{ duration: 3, repeat: Infinity, delay: 1.2 }}
                              onClick={() => deleteQuestion(q.id)}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </motion.button>
                          </div>
                        </div>
                        <p className="mb-2 text-sm font-medium text-slate-800 dark:text-white">{q.question}</p>
                        {q.type === 'multiple-choice' && q.options.length > 0 && (
                          <div className="mb-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            {q.options.map((opt, oi) => (
                              <div
                                key={oi}
                                className={cn(
                                  'rounded-lg px-2.5 py-1.5 text-xs',
                                  q.correctAnswer === String.fromCharCode(65 + oi)
                                    ? 'bg-emerald-50 font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/30'
                                    : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                )}
                              >
                                <span className="font-bold">{String.fromCharCode(65 + oi)}.</span> {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'true-false' && (
                          <div className="mb-2 flex gap-2">
                            <span className={cn('rounded-lg px-3 py-1 text-xs font-semibold',
                              q.correctAnswer === 'True' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'
                            )}>True</span>
                            <span className={cn('rounded-lg px-3 py-1 text-xs font-semibold',
                              q.correctAnswer === 'False' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'
                            )}>False</span>
                          </div>
                        )}
                        {q.explanation && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold">Explanation:</span> {q.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredQuestions.length === 0 && questions.length > 0 && (
              <div className="flex flex-col items-center py-12">
                <Search className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500">No questions match your filters.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, bg }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  color: string;
  bg: string;
}) {
  return (
    <motion.div
      variants={bounceIn}
      whileHover={{ y: -4 }}
      className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
    >
      <motion.div
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', bg)}
      >
        <Icon className={cn('h-5 w-5', color)} />
      </motion.div>
      <h3 className="mb-1 text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
    </motion.div>
  );
}

function StatMini({ label, value, icon: Icon, color }: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
      <div className="flex items-center gap-1.5">
        <motion.span
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Icon className={cn('h-3.5 w-3.5', color)} />
        </motion.span>
        <span className="text-[10px] font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-slate-800 dark:text-white">{value}</p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold uppercase text-slate-400">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
