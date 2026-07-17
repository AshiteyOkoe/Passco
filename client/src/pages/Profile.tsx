import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Check, Loader2, User, Mail, Calendar, Building2, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DefaultAvatar, MaleAvatar, FemaleAvatar } from '../components/DefaultAvatars';
import ImageCropper from '../components/ImageCropper';
import { cn } from '../utils';
import { fadeUp } from '../utils/animations';

const classOptions = ['JHS 1', 'JHS 2', 'JHS 3'];

export default function Profile() {
  const { user, updateProfile, updateAvatar } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [gender, setGender] = useState<'male' | 'female' | ''>(user?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [classLevel, setClassLevel] = useState(user?.classLevel || '');
  const [selectedAvatar, setSelectedAvatar] = useState<'male' | 'female' | 'upload' | ''>(() => {
    if (user?.avatar === 'avatar:male') return 'male';
    if (user?.avatar === 'avatar:female') return 'female';
    if (user?.avatar?.startsWith('/uploads/')) return 'upload';
    return (user?.gender as 'male' | 'female') || '';
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar?.startsWith('/uploads/') ? user.avatar : null
  );
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropImageSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async (file: File) => {
    setCropImageSrc(null);
    setUploading(true);
    try {
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
      setSelectedAvatar('upload');
      const avatarUrl = await updateAvatar(file);
      setAvatarPreview(avatarUrl);
    } catch {
      setAvatarPreview(user?.avatar || null);
    } finally {
      setUploading(false);
    }
  };

  const handleGenderChange = (g: 'male' | 'female') => {
    setGender(g);
    if (selectedAvatar !== 'upload') {
      setSelectedAvatar(g);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await updateProfile({
        name,
        gender: gender || undefined,
        dateOfBirth,
        institution,
        classLevel,
        avatar: selectedAvatar === 'male' ? 'avatar:male' : selectedAvatar === 'female' ? 'avatar:female' : avatarPreview || '',
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      console.error('Profile save error:', err);
      setSaveError(err?.response?.data?.message || err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 transition-colors dark:bg-slate-950 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
          <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">Manage your profile information and avatar.</p>

          {/* Avatar Section */}
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Profile Picture</h2>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-100 dark:ring-indigo-900" />
                ) : (
                  <DefaultAvatar gender={gender} size={96} className="rounded-full ring-4 ring-indigo-100 dark:ring-indigo-900" />
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Choose a default avatar or upload your own:</p>
                <div className="mb-4 flex items-center gap-3">
                  <button onClick={() => { setSelectedAvatar('male'); setGender('male'); setAvatarPreview(null); }} className={cn('group relative rounded-full transition-all', selectedAvatar === 'male' ? 'ring-3 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : 'hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600')}>
                    <MaleAvatar size={56} className="rounded-full" />
                    {selectedAvatar === 'male' && <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white"><Check className="h-3 w-3" /></span>}
                  </button>
                  <button onClick={() => { setSelectedAvatar('female'); setGender('female'); setAvatarPreview(null); }} className={cn('group relative rounded-full transition-all', selectedAvatar === 'female' ? 'ring-3 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : 'hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600')}>
                    <FemaleAvatar size={56} className="rounded-full" />
                    {selectedAvatar === 'female' && <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white"><Check className="h-3 w-3" /></span>}
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className={cn('flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed transition-all', selectedAvatar === 'upload' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 dark:border-slate-600 dark:hover:border-indigo-500 dark:hover:bg-slate-800')}>
                    <Camera className="h-5 w-5 text-slate-400" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG or WebP. Max 5MB. You can crop after uploading.</p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Personal Information</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <User className="h-3.5 w-3.5" /> Student Name
                </label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Mail className="h-3.5 w-3.5" /> Email
                </label>
                <input type="email" value={user?.email || ''} disabled className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500" />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Gender</label>
                <div className="flex gap-3">
                  <button onClick={() => handleGenderChange('male')} className={cn('flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition', gender === 'male' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400')}>Male</button>
                  <button onClick={() => handleGenderChange('female')} className={cn('flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-medium transition', gender === 'female' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400')}>Female</button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Calendar className="h-3.5 w-3.5" /> Date of Birth *
                </label>
                <input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Building2 className="h-3.5 w-3.5" /> School
                </label>
                <input type="text" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. Accra Academy" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500" />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <BookOpen className="h-3.5 w-3.5" /> Class
                </label>
                <select value={classLevel} onChange={e => setClassLevel(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="">Select class</option>
                  {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {saveError && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
              {saveError}
            </motion.div>
          )}
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={saving}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all',
                saved
                  ? 'bg-emerald-500 text-white'
                  : 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 dark:shadow-indigo-900/40',
                saving && 'cursor-not-allowed opacity-70'
              )}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Image Cropper Modal */}
      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          onCrop={handleCropConfirm}
          onCancel={() => setCropImageSrc(null)}
        />
      )}
    </div>
  );
}
