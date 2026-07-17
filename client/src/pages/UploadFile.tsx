import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadFile, processFile, generateQuestions } from '../services/api';
import { Upload, FileText, CheckCircle, X, Loader2, Sparkles, Image, File as FileIcon, Cloud } from 'lucide-react';
import { cn } from '../utils';
import { fadeUp, scaleIn, stagger } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';

const FileTypeIcon = ({ mimeType, className }: { mimeType: string; className?: string }) => {
  if (mimeType.startsWith('image/')) return <Image className={className} />;
  if (mimeType.includes('pdf')) return <FileText className={className} />;
  if (mimeType.includes('text')) return <FileIcon className={className} />;
  return <FileText className={className} />;
};

export default function UploadFile() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<'idle' | 'uploaded' | 'processed' | 'ready'>('idle');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'expert'>('intermediate');
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    if (!uploading) { setUploadProgress(0); progressRef.current = 0; return; }
    progressRef.current = 0;
    const interval = setInterval(() => {
      progressRef.current = Math.min(progressRef.current + Math.random() * 15 + 5, 90);
      setUploadProgress(progressRef.current);
    }, 300);
    return () => clearInterval(interval);
  }, [uploading]);

  const handleFileSelect = useCallback((file: File) => {
    const allowedTypes = [
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'image/jpeg', 'image/png', 'image/webp',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload PDF, DOCX, TXT, PPT, or image files only.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert('File must be under 20MB.');
      return;
    }
    setSelectedFile(file);
    setStatus('idle');
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const res = await uploadFile(selectedFile);
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 400));
      setDocumentId(res.document.id);
      setStatus('uploaded');
      setProcessing(true);
      await processFile(res.document.id);
      setStatus('processed');
    } catch (err) {
      console.error(err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!documentId) return;
    setGenerating(true);
    try {
      const res = await generateQuestions({ documentId, difficulty, count: 10 });
      setStatus('ready');
      setTimeout(() => navigate(`/quiz/${res.quizId}`, { state: { difficulty } }), 800);
    } catch (err) {
      console.error(err);
      alert('Failed to generate quiz.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  return (
    <div className="p-6">
      <motion.div className="mb-6" variants={fadeUp} initial="hidden" animate="visible">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Study Material</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Supported: PDF, DOCX, TXT, PPT, JPEG, PNG, WEBP</p>
      </motion.div>

      <div className="mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => inputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-12 transition hover:border-indigo-400 hover:bg-indigo-50/50 dark:border-slate-700 dark:hover:border-indigo-500 dark:hover:bg-indigo-500/5"
                >
                  <motion.div
                    className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/10"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Upload className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                  </motion.div>
                  <p className="mb-1 text-base font-semibold text-slate-800 dark:text-white">Upload study material</p>
                  <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Drag & drop or click to browse</p>
                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> PDF</span>
                    <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> DOCX</span>
                    <span className="flex items-center gap-1"><FileIcon className="h-3.5 w-3.5" /> TXT</span>
                    <span className="flex items-center gap-1"><Image className="h-3.5 w-3.5" /> Images</span>
                  </div>
                  <input ref={inputRef} type="file" accept=".pdf,.docx,.doc,.txt,.ppt,.pptx,.jpg,.jpeg,.png,.webp" onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="file-selected"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
                <motion.div variants={scaleIn} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/10">
                    <FileTypeIcon mimeType={selectedFile.type} className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setSelectedFile(null); setStatus('idle'); setDocumentId(null); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </motion.button>
                </motion.div>

                {preview && (
                  <motion.div variants={scaleIn} className="overflow-hidden rounded-xl">
                    <img src={preview} alt="Upload preview" className="h-48 w-full object-cover" />
                  </motion.div>
                )}

                {uploading && (
                  <motion.div
                    variants={fadeUp}
                    className="rounded-xl bg-indigo-50 p-5 dark:bg-indigo-500/5"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Cloud className="h-6 w-6 text-indigo-500" />
                      </motion.div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Uploading...</p>
                        <p className="text-xs text-indigo-500/70 dark:text-indigo-400/70">{Math.round(uploadProgress)}%</p>
                      </div>
                      <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-indigo-200 dark:bg-indigo-800">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                        initial={{ width: '0%' }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </motion.div>
                )}

                {status === 'idle' && !uploading && (
                  <motion.button
                    variants={fadeUp}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpload}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
                  >
                    <Upload className="h-4 w-4" /> Upload & Process
                  </motion.button>
                )}

                {(status === 'uploaded' || status === 'processed') && !uploading && (
                  <motion.div
                    variants={fadeUp}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/5"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: [0, 10, 0] }}
                          transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </motion.div>
                      )}
                      {processing ? 'Processing file...' : 'File processed successfully!'}
                    </div>
                    {processing && (
                      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-800">
                        <motion.div
                          className="h-full rounded-full bg-emerald-500"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                      </div>
                    )}
                  </motion.div>
                )}

                <AnimatePresence>
                  {status === 'processed' && (
                    <motion.div
                      key="quiz-options"
                      variants={stagger}
                      initial="hidden"
                      animate="visible"
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <motion.div variants={fadeUp}>
                        <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Quiz Difficulty</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['beginner', 'intermediate', 'expert'] as const).map((d) => (
                            <motion.button
                              key={d}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setDifficulty(d)}
                              className={cn(
                                'flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-medium transition',
                                difficulty === d
                                  ? d === 'beginner' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                    : d === 'intermediate' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                    : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400'
                              )}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {d.charAt(0).toUpperCase() + d.slice(1)}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>

                      <motion.button
                        variants={fadeUp}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGenerateQuiz}
                        disabled={generating}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50"
                      >
                        {generating ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Generating Quiz...</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> Generate Quiz</>
                        )}
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {status === 'ready' && (
                    <motion.div
                      key="ready"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-3 rounded-xl bg-emerald-50 p-6 dark:bg-emerald-500/5"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 200 }}
                      >
                        <CheckCircle className="h-10 w-10 text-emerald-500" />
                      </motion.div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">Quiz generated! Redirecting...</p>
                      <motion.div
                        className="h-1.5 w-48 overflow-hidden rounded-full bg-emerald-200 dark:bg-emerald-800"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <motion.div
                          className="h-full rounded-full bg-emerald-500"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
