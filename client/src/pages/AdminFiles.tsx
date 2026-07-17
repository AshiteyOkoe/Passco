import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getDocuments, deleteDocument, getQuestions, generateQuestions,
  uploadFile, processFile,
} from '../services/api';
import {
  FileText, Trash2, CheckCircle2, XCircle, Clock, Sparkles, Loader2,
  Upload, Search, Eye, X, FileCode2, GripVertical, AlertCircle,
  CloudUpload, RefreshCw,
} from 'lucide-react';
import { cn } from '../utils';
import { fadeUp, scaleIn, slideUp, stagger, bounceIn } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import type { UploadedDocument, Question } from '../types';

export default function AdminFiles() {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const [search, setSearch] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showExtractedText, setShowExtractedText] = useState<string | null>(null);
  const [extractedTextContent, setExtractedTextContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    Promise.all([getDocuments(), getQuestions()])
      .then(([docsRes, qRes]) => {
        setDocuments(docsRes.documents);
        setQuestions(qRes.questions);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 15, 90));
      }, 200);
      await uploadFile(file);
      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        load();
      }, 500);
    } catch (err) {
      console.error(err);
      setUploading(false);
      setUploadProgress(0);
      alert('Failed to upload file.');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document and all its questions?')) return;
    await deleteDocument(id);
    if (selectedDoc === id) setSelectedDoc(null);
    load();
  };

  const handleGenerate = async (docId: string) => {
    setGenerating(docId);
    try {
      await generateQuestions({ documentId: docId, difficulty, count: 10 });
      load();
    } catch (err) {
      console.error(err);
      alert('Failed to generate questions.');
    } finally {
      setGenerating(null);
    }
  };

  const handleViewText = (doc: UploadedDocument) => {
    setShowExtractedText(doc.id);
    setExtractedTextContent(doc.extractedText || 'No extracted text available.');
  };

  const filteredDocs = documents.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.originalName.toLowerCase().includes(q) ||
      (d.topics && d.topics.some((t) => t.toLowerCase().includes(q))) ||
      (d.uploadedBy && d.uploadedBy.toLowerCase().includes(q))
    );
  });

  const docQuestions = selectedDoc ? questions.filter((q) => q.documentId === selectedDoc) : [];
  const selectedDocument = documents.find((d) => d.id === selectedDoc);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <AnimatedSpinner label="Loading documents..." />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <motion.h1
        className="mb-6 text-2xl font-bold text-slate-900 dark:text-white"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        File Management
      </motion.h1>

      <motion.div
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
          <CloudUpload className="h-4 w-4 text-indigo-500" />
          Upload New File
        </h2>
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all',
            dragOver
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
              : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/5'
          )}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <div className="w-full max-w-xs">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-500">Uploading...</span>
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">{uploadProgress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                    initial={{ width: '0%' }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
              <motion.div
                className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/10"
                animate={dragOver ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
              >
                <Upload className="h-6 w-6 text-indigo-500" />
              </motion.div>
              <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                {dragOver ? 'Drop file here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                PDF, DOCX, TXT, or image files supported
              </p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileSelect}
          />
        </motion.div>
      </motion.div>

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
            placeholder="Search files by name, topic, or uploader..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={load}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </motion.button>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          <AnimatePresence>
            {filteredDocs.map((doc, i) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                onClick={() => setSelectedDoc(doc.id)}
                className={cn(
                  'flex items-center gap-4 rounded-xl border bg-white p-4 cursor-pointer transition-all hover:shadow-sm dark:bg-slate-900',
                  selectedDoc === doc.id
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800'
                )}
              >
                <div className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  doc.status === 'ready' ? 'bg-emerald-100 dark:bg-emerald-500/10'
                    : doc.status === 'failed' ? 'bg-rose-100 dark:bg-rose-500/10'
                      : 'bg-slate-100 dark:bg-slate-800'
                )}>
                  {doc.status === 'ready' ? <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    : doc.status === 'failed' ? <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      : <Clock className="h-5 w-5 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{doc.originalName}</p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                    {doc.uploadedBy && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span>by {doc.uploadedBy}</span>
                      </>
                    )}
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium',
                      doc.status === 'ready' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : doc.status === 'failed' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    )}>
                      {doc.status}
                    </span>
                  </div>
                  {doc.topics && doc.topics.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {doc.topics.slice(0, 4).map((topic) => (
                        <span key={topic} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {topic}
                        </span>
                      ))}
                      {doc.topics.length > 4 && (
                        <span className="text-[10px] text-slate-400">+{doc.topics.length - 4} more</span>
                      )}
                    </div>
                  )}
                  <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                    {questions.filter((q) => q.documentId === doc.id).length} questions · {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {doc.status === 'ready' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); handleGenerate(doc.id); }}
                      disabled={generating === doc.id}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 disabled:opacity-50"
                    >
                      {generating === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Generate
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); handleViewText(doc); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-500 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                    title="View Extracted Text"
                  >
                    <Eye className="h-4 w-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredDocs.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"
            >
              <Upload className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                {search ? 'No files match your search.' : 'No documents uploaded yet.'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Upload a file above to get started.
              </p>
            </motion.div>
          )}
        </div>

        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-20 lg:self-start"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">
            {selectedDoc ? (
              <span className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-indigo-500" />
                Questions
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-400" />
                Select a document
              </span>
            )}
          </h3>

          {selectedDoc && selectedDocument && (
            <motion.div
              className="mb-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <p className="mb-2 truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                {selectedDocument.originalName}
              </p>
              <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Generate difficulty</label>
              <div className="grid grid-cols-3 gap-1">
                {(['beginner', 'intermediate', 'expert'] as const).map((d) => (
                  <motion.button
                    key={d}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'rounded-lg px-2 py-1.5 text-xs font-medium transition',
                      difficulty === d
                        ? d === 'beginner' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : d === 'intermediate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                        : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
                    )}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </motion.button>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleGenerate(selectedDoc)}
                disabled={generating === selectedDoc}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50"
              >
                {generating === selectedDoc ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="h-3 w-3" /> Generate 10 Questions</>
                )}
              </motion.button>
            </motion.div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {docQuestions.map((q, i) => (
                <motion.div
                  key={q._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <p className="text-xs font-medium text-slate-800 dark:text-white line-clamp-2">{q.question}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                      {q.type === 'multiple-choice' ? 'MCQ' : 'T/F'}
                    </span>
                    <span className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-medium',
                      q.approved
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                    )}>
                      {q.approved ? 'Approved' : 'Pending'}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{q.difficulty}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {selectedDoc && docQuestions.length === 0 && (
              <div className="flex flex-col items-center py-6">
                <AlertCircle className="mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400">No questions yet.</p>
                <p className="text-[10px] text-slate-400">Click Generate above to create some.</p>
              </div>
            )}
            {!selectedDoc && (
              <div className="flex flex-col items-center py-6">
                <Eye className="mb-2 h-6 w-6 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Click a document to view its questions.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showExtractedText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowExtractedText(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Extracted Text</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowExtractedText(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>
              <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(80vh - 60px)' }}>
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {extractedTextContent}
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
