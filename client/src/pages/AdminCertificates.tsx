import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Crown, Upload, FileUp, Trash2, Eye, Image, Shield, CheckCircle2,
  AlertCircle, Save, RotateCcw, BadgeCheck, Award, Star, Gem,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';
import { fadeUp, slideUp } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import { getStudents } from '../services/api';

interface SignatureData {
  name: string;
  title: string;
  imageData: string;
  uploadedAt: string;
}

const DEFAULT_SIGNATURE: SignatureData = {
  name: 'Jonathan Ashitey Okoe',
  title: 'Director, PASSCO',
  imageData: '',
  uploadedAt: '',
};

export default function AdminCertificates() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signature, setSignature] = useState<SignatureData>(DEFAULT_SIGNATURE);
  const [previewSignature, setPreviewSignature] = useState<SignatureData>(DEFAULT_SIGNATURE);
  const [dragActive, setDragActive] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    Promise.all([
      getStudents().then(s => setStudentCount(s.students.length)).catch(() => {}),
    ]).finally(() => setLoading(false));

    try {
      const raw = localStorage.getItem('passco-admin-signature');
      if (raw) {
        const parsed = JSON.parse(raw);
        setSignature(parsed);
        setPreviewSignature(parsed);
      } else {
        const imageData = localStorage.getItem('passco-admin-signature-image') || '';
        if (imageData) {
          const loaded = { ...DEFAULT_SIGNATURE, imageData, uploadedAt: localStorage.getItem('passco-admin-signature-date') || '' };
          setSignature(loaded);
          setPreviewSignature(loaded);
        }
      }
    } catch {
      const imageData = localStorage.getItem('passco-admin-signature-image') || '';
      if (imageData) {
        const loaded = { ...DEFAULT_SIGNATURE, imageData, uploadedAt: localStorage.getItem('passco-admin-signature-date') || '' };
        setSignature(loaded);
        setPreviewSignature(loaded);
      }
    }
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const updated = { ...signature, imageData: dataUrl, uploadedAt: new Date().toISOString() };
      setSignature(updated);
      setPreviewSignature(updated);
    };
    reader.readAsDataURL(file);
  }, [signature]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleSave = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('passco-admin-signature', JSON.stringify(signature));
      localStorage.setItem('passco-admin-signature-image', signature.imageData);
      localStorage.setItem('passco-admin-signature-date', signature.uploadedAt);
      setPreviewSignature(signature);
      setSaving(false);
    }, 500);
  }, [signature]);

  const handleReset = useCallback(() => {
    setSignature(DEFAULT_SIGNATURE);
    setPreviewSignature(DEFAULT_SIGNATURE);
    localStorage.removeItem('passco-admin-signature');
    localStorage.removeItem('passco-admin-signature-image');
    localStorage.removeItem('passco-admin-signature-date');
  }, []);

  const handleRemove = useCallback(() => {
    setSignature(prev => ({ ...prev, imageData: '', uploadedAt: '' }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <AnimatedSpinner label="Loading certificate settings..." />
      </div>
    );
  }

  const hasChanges = signature.imageData !== previewSignature.imageData || signature.name !== previewSignature.name;
  const hasSignature = !!signature.imageData;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-8">

        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2340] shadow-lg shadow-blue-900/25">
              <Crown className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Certificate Settings</h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Manage the director's signature used on A+ certificates
              </p>
            </div>
          </div>
        </motion.div>

        {/* Status Banner */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className={cn(
            'flex items-center gap-3 rounded-xl border p-4',
            hasSignature
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-500/10'
              : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-500/10'
          )}
        >
          {hasSignature ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <div className="flex-1">
            <p className={cn('text-sm font-semibold', hasSignature ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300')}>
              {hasSignature ? 'Signature is configured and active on all certificates.' : 'No signature uploaded yet. Certificates will show a blank signature line.'}
            </p>
          </div>
          {hasSignature && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Uploaded {new Date(signature.uploadedAt).toLocaleDateString()}
            </span>
          )}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Upload Section */}
          <motion.div
            className="lg:col-span-3"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                <FileUp className="h-4 w-4 text-blue-500" /> Upload Signature
              </h2>

              {/* Drop Zone */}
              <div
                className={cn(
                  'relative mb-6 rounded-xl border-2 border-dashed p-8 text-center transition-all',
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-blue-500 dark:hover:bg-slate-800/50'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                  {hasSignature ? (
                    <Image className="h-8 w-8 text-emerald-500" />
                  ) : (
                    <Upload className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <p className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {hasSignature ? 'Replace signature image' : 'Drop signature image here'}
                </p>
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                  or click to browse — PNG, JPG, SVG (max 5MB)
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  <FileUp className="h-4 w-4" />
                  {hasSignature ? 'Upload New' : 'Choose File'}
                </button>
              </div>

              {/* Current Signature Preview */}
              {hasSignature && (
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">CURRENT SIGNATURE</p>
                    <button
                      onClick={handleRemove}
                      className="flex items-center gap-1 text-xs font-medium text-rose-500 transition hover:text-rose-600"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <img
                      src={signature.imageData}
                      alt="Current signature"
                      className="h-20 w-auto object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Director Name Field */}
              <div className="mb-6">
                <label className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                  DIRECTOR NAME
                </label>
                <input
                  type="text"
                  value={signature.name}
                  onChange={(e) => setSignature(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition',
                    hasChanges && !saving
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-700'
                      : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                  )}
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save Changes
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
              </div>
            </div>
          </motion.div>

          {/* Preview Section */}
          <motion.div
            className="lg:col-span-2"
            variants={slideUp}
            initial="hidden"
            animate="visible"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                <Eye className="h-4 w-4 text-violet-500" /> Certificate Preview
              </h2>

              <div className="space-y-2">
                <InfoRow label="Active students" value={`${studentCount} students`} />
                <InfoRow label="Signature format" value="PNG/JPG/SVG, max 5MB" />
                <InfoRow label="Storage" value="Browser localStorage" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Full Page Certificate */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div
            className="relative mx-auto flex min-h-[75vh] flex-col items-center justify-center overflow-hidden p-16"
            style={{ fontFamily: 'Georgia, serif', background: 'linear-gradient(145deg, #f8f4eb 0%, #fdfaf3 30%, #f5f0e8 70%, #faf7f0 100%)' }}
          >
            {/* Decorative corners */}
            <div className="absolute left-4 top-4 h-20 w-20 border-t-2 border-l-2 border-yellow-600/40" />
            <div className="absolute right-4 top-4 h-20 w-20 border-t-2 border-r-2 border-yellow-600/40" />
            <div className="absolute bottom-4 left-4 h-20 w-20 border-b-2 border-l-2 border-yellow-600/40" />
            <div className="absolute bottom-4 right-4 h-20 w-20 border-b-2 border-r-2 border-yellow-600/40" />

            {/* Inner decorative border */}
            <div className="absolute inset-8 border border-yellow-600/15" />
            <div className="absolute inset-10 border border-yellow-600/10" />

            {/* Subtle watermark pattern */}
            <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #1e3a5f 0, #1e3a5f 1px, transparent 1px, transparent 15px)' }} />

            {/* Top Stars */}
            <div className="mb-2 flex items-center gap-3">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            </div>

            {/* Logo */}
            <img src="/images/logos/passcologo.svg" alt="Passco" className="mb-4 h-24 w-auto object-contain mix-blend-multiply drop-shadow-sm" />
            <p className="text-sm font-semibold tracking-[0.35em] text-[#1e3a5f]">PASSCO EDUCATIONAL PLATFORM</p>

            <div className="my-5 h-px w-72 bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />

            {/* Title with verified badge */}
            <div className="flex items-center gap-3">
              <h3 className="text-4xl font-bold text-[#1e3a5f]" style={{ fontFamily: 'Georgia, serif' }}>Certificate of Excellence</h3>
              <BadgeCheck className="h-9 w-9 text-emerald-500 drop-shadow" />
            </div>
            <p className="mt-1.5 text-sm tracking-[0.3em] text-yellow-700 font-medium">A+ ACHIEVEMENT AWARD</p>

            <p className="mt-8 text-sm italic text-slate-500">This is proudly presented to</p>
            <p className="mt-1 text-3xl font-bold text-[#1e3a5f] underline decoration-yellow-600/30 decoration-2 underline-offset-8" style={{ fontFamily: 'Georgia, serif' }}>Student Name</p>

            <div className="my-5 h-px w-72 bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />

            <p className="max-w-lg text-center text-sm leading-relaxed text-slate-500 italic">
              For achieving outstanding academic excellence and demonstrating exceptional performance in assessments. This certificate is officially verified and authenticated.
            </p>

            {/* Verified badge strip */}
            <div className="mt-4 flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 dark:border-emerald-800 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-semibold tracking-wider text-emerald-700 dark:text-emerald-300">OFFICIALLY VERIFIED CERTIFICATE</span>
              <Gem className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            </div>

            {/* Signature, Seal, Date */}
            <div className="mt-10 flex w-full max-w-2xl items-end justify-between">
              {/* Director Signature */}
              <div className="flex flex-col items-center">
                {hasSignature ? (
                  <img src={signature.imageData} alt="Signature" className="mb-2 h-20 w-auto object-contain drop-shadow-sm" />
                ) : (
                  <div className="mb-2 h-20 w-56 border-b-2 border-[#1e3a5f]/30" />
                )}
                <p className="text-sm font-bold text-[#1e3a5f]">{signature.name}</p>
                <p className="text-[10px] tracking-wider text-slate-500">{signature.title.toUpperCase()}</p>
              </div>

              {/* Official Seal */}
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-yellow-600/40 bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 shadow-lg" />
                <div className="absolute inset-1.5 rounded-full border border-yellow-600/20" />
                <div className="relative flex flex-col items-center">
                  <Shield className="h-6 w-6 text-yellow-700" />
                  <p className="mt-0.5 text-[6px] font-bold tracking-wider text-yellow-800">PASSCO</p>
                  <p className="text-[5px] tracking-wider text-yellow-700">OFFICIAL</p>
                </div>
              </div>

              {/* Date & Certificate ID */}
              <div className="flex flex-col items-center">
                <div className="mb-2 h-20 w-56 border-b-2 border-[#1e3a5f]/30" />
                <p className="text-sm font-bold text-[#1e3a5f]">{new Date().toLocaleDateString()}</p>
                <p className="text-[10px] tracking-wider text-slate-500">DATE</p>
                <p className="mt-2 rounded bg-[#1e3a5f]/5 px-2 py-0.5 text-[7px] font-mono tracking-wider text-slate-400">CERT-{new Date().getFullYear()}-000001</p>
              </div>
            </div>

            {/* Bottom Stars */}
            <div className="mt-6 flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600/60" />
              <p className="text-[9px] tracking-[0.2em] text-slate-400">CERTIFIED AND AUTHORIZED BY PASSCO</p>
              <Award className="h-5 w-5 text-yellow-600/60" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{value}</span>
    </div>
  );
}
