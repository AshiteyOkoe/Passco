import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  ArrowLeft, Camera, Check, Loader2, User, Mail, AtSign, Phone, Calendar, Building2, BookOpen, LogOut,
  Shield, KeyRound, Eye, EyeOff, Lock, CheckCircle2, AlertCircle, GraduationCap, Trophy, Medal, Flame,
  Zap, Activity, TrendingUp, Target, Award, Sparkles, BarChart3, ChevronRight, ArrowRight, HelpCircle,
  MessageCircle, Bell, Palette, CreditCard, Clock, RefreshCw, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { DefaultAvatar } from '../components/DefaultAvatars';
import ImageCropper from '../components/ImageCropper';
import { cn } from '../utils';
import { fadeUp } from '../utils/animations';
import { resolveUploadUrl, isCustomAvatar, getProfile, getMyAssessmentResults, getMyActivity, getMyDocumentRequests, createDocumentRequest, changePassword, revokeSessions, deactivateAccount, type AuditLogEntry } from '../services/api';
import type { User as UserType, DocumentRequestRecord } from '../types';
import { useToast } from '../components/toast/ToastProvider';
import {
  getLocalAssessments,
  mergeAssessments,
  computeProfileStats,
  computeSubjectBreakdown,
  filterByRange,
  buildTimeSeries,
  buildSubjectChart,
  computeStreaks,
  buildActivityDays,
  computeBadgeSummary,
  isEligibleForCertificate,
  getClassLabel,
  getAssessmentTypeLabel,
} from '../utils/learningProfile';
import { SUBJECT_META, type SubjectId } from '../data/questionBank';

const TIER_STYLES: Record<string, string> = {
  bronze: 'from-amber-600 to-yellow-700',
  silver: 'from-slate-400 to-gray-500',
  gold: 'from-yellow-400 to-amber-500',
  platinum: 'from-cyan-400 to-blue-500',
  diamond: 'from-violet-400 to-purple-600',
};

const SUBJECT_CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#ef4444'];

const DEFAULT_NOTIFS = {
  assessmentReminders: true,
  streakAlerts: true,
  badgeAlerts: true,
  weeklySummary: true,
  offers: false,
};

const NOTIF_LIST = [
  { key: 'assessmentReminders', label: 'Assessment reminders', desc: 'Nudge me about practice sessions and deadlines' },
  { key: 'streakAlerts', label: 'Streak alerts', desc: 'Tell me when my streak is about to break' },
  { key: 'badgeAlerts', label: 'Badge & achievement alerts', desc: 'Notify me when I earn a new badge' },
  { key: 'weeklySummary', label: 'Weekly progress summary', desc: 'A short recap every Sunday' },
  { key: 'offers', label: 'Product news & offers', desc: 'Occasional updates about PASSCO' },
];

const DEFAULT_PRIVACY = {
  showOnLeaderboard: true,
  shareProgress: false,
  recommendations: true,
};

const PRIVACY_LIST = [
  { key: 'showOnLeaderboard', label: 'Show me on the public leaderboard', desc: 'Your name and best scores appear on /leaderboard' },
  { key: 'shareProgress', label: 'Share learning progress with teachers', desc: 'Lets your school keep an eye on your progress' },
  { key: 'recommendations', label: 'Personalized recommendations', desc: 'Allow us to suggest subjects and topics for you' },
];

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '3mo', days: 90 },
  { label: 'All', days: 0 },
];

const ACTIVITY_META: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  login: { label: 'Signed in', Icon: User, color: 'text-indigo-500' },
  login_failed: { label: 'Failed sign-in attempt', Icon: AlertCircle, color: 'text-rose-500' },
  password_changed: { label: 'Password changed', Icon: KeyRound, color: 'text-amber-500' },
  sessions_revoked: { label: 'Sessions revoked', Icon: Shield, color: 'text-emerald-500' },
  avatar_updated: { label: 'Profile picture updated', Icon: Camera, color: 'text-cyan-500' },
  profile_updated: { label: 'Profile updated', Icon: User, color: 'text-slate-500 dark:text-slate-300' },
  payment_verified: { label: 'Payment confirmed', Icon: CreditCard, color: 'text-emerald-500' },
  contact_submitted: { label: 'Sent a support message', Icon: MessageCircle, color: 'text-violet-500' },
  question_reported: { label: 'Reported a question', Icon: AlertCircle, color: 'text-rose-500' },
};

const SECURITY_ACTIONS = new Set(['login', 'login_failed', 'password_changed', 'sessions_revoked', 'avatar_updated', 'account_deactivated']);

function formatDuration(secs: number): string {
  const m = Math.floor((secs || 0) / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function Profile() {
  const { user, updateProfile, updateAvatar, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const { effectivePlan, isTrial, trialDaysLeft, subscription, planLimits, loading: subLoading, refresh: refreshSubscription } = useSubscription();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [username, setUsername] = useState(user?.username || '');
  const [gender, setGender] = useState<'male' | 'female' | ''>(user?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '');
  const [institution, setInstitution] = useState(user?.institution || '');
  const [classLevel, setClassLevel] = useState(user?.classLevel || '');
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(isCustomAvatar(user?.avatar) ? user!.avatar! : null);
  const [uploading, setUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  const [serverResults, setServerResults] = useState<Array<Record<string, unknown>>>([]);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [certRequests, setCertRequests] = useState<DocumentRequestRecord[]>([]);
  const [requestingCert, setRequestingCert] = useState(false);
  const toast = useToast();

  const [range, setRange] = useState(30);
  const [showPasswords, setShowPasswords] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [revoking, setRevoking] = useState(false);

  const prefs = (user?.preferences || {}) as Record<string, Record<string, boolean>>;
  const notifPrefs = useMemo(() => ({ ...DEFAULT_NOTIFS, ...(prefs.notifications || {}) }), [prefs.notifications]);
  const privacyPrefs = useMemo(() => ({ ...DEFAULT_PRIVACY, ...(prefs.privacy || {}) }), [prefs.privacy]);

  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [profile, results, docRequests] = await Promise.all([
          getProfile(),
          getMyAssessmentResults().catch(() => ({ results: [] })),
          getMyDocumentRequests().catch(() => ({ requests: [] })),
        ]);
        if (!alive) return;
        setName(profile.name || name);
        setPhone(profile.phone || phone);
        setUsername(profile.username || username);
        setGender((profile.gender as 'male' | 'female' | '') || gender);
        setDateOfBirth(profile.dateOfBirth ? profile.dateOfBirth.split('T')[0] : dateOfBirth);
        setInstitution(profile.institution || institution);
        setClassLevel(profile.classLevel || classLevel);
        setServerResults(Array.isArray(results.results) ? results.results : []);
        setCertRequests((docRequests.requests || []).filter((r) => r.kind === 'certificate'));
        if (user?.id) getMyActivity(user.id, 40).then((logs) => { if (alive) setActivity(logs); }).catch(() => {});
      } catch {
        /* keep defaults */
      } finally {
        if (alive) { setLoadingData(false); setDataLoaded(true); }
      }
    })();
    return () => { alive = false; };
  }, []);

  const local = useMemo(() => getLocalAssessments(), [dataLoaded]);
  const all = useMemo(() => mergeAssessments(serverResults, local), [serverResults, local]);
  const stats = useMemo(() => computeProfileStats(all), [all]);
  const subjectStats = useMemo(() => computeSubjectBreakdown(all), [all]);
  const badgeSummary = useMemo(() => computeBadgeSummary(all), [all]);
  const streaks = useMemo(() => computeStreaks(all), [all]);
  const eligible = useMemo(() => isEligibleForCertificate(all), [all]);
  const certRequest = useMemo(() => (certRequests.length > 0 ? certRequests[0] : null), [certRequests]);
  const certApproved = certRequest?.status === 'approved';
  const certPending = certRequest?.status === 'pending';
  const requestBusy = requestingCert; // alias for readability below

  const filtered = useMemo(() => filterByRange(all, range), [all, range]);
  const timeSeries = useMemo(() => buildTimeSeries(filtered, { cumulative: true }), [filtered]);
  const subjectChart = useMemo(() => buildSubjectChart(filtered), [filtered]);
  const heatmap = useMemo(() => buildActivityDays(all), [all]);
  const securityFeed = useMemo(() => activity.filter((a) => SECURITY_ACTIONS.has(a.action)).slice(0, 12), [activity]);

  const strengths = subjectStats.filter((s) => s.status === 'strength');
  const improvements = subjectStats.filter((s) => s.status === 'improve');
  const developing = subjectStats.filter((s) => s.status === 'developing' && !strengths.includes(s) && !improvements.includes(s));

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
      const avatarUrl = await updateAvatar(file);
      setAvatarPreview(avatarUrl);
    } catch {
      setAvatarPreview(user?.avatar || null);
    } finally {
      setUploading(false);
    }
  };

  const savePersonal = async () => {
    setSavingPersonal(true);
    try {
      await updateProfile({ name, phone, username, gender, dateOfBirth, institution, classLevel });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 4000);
    } finally {
      setSavingPersonal(false);
    }
  };

  const togglePref = async (section: 'notifications' | 'privacy', key: string, value: boolean) => {
    const next = { ...prefs, [section]: { ...(prefs[section] || {}), [key]: value } };
    await updateProfile({ preferences: next } as Partial<UserType>);
  };

  const requestCertificate = async () => {
    setRequestingCert(true);
    try {
      const { request } = await createDocumentRequest({ kind: 'certificate' });
      setCertRequests((prev) => [request, ...prev.filter((r) => r.kind !== 'certificate' || r.status !== 'pending')]);
      toast.success('Certificate request submitted.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to submit request.';
      toast.error(msg);
    } finally {
      setRequestingCert(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    if (newPassword.length < 6) {
      setPwMessage({ ok: false, text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwMessage({ ok: true, text: 'Password updated successfully.' });
    } catch {
      setPwMessage({ ok: false, text: 'Could not change password. Check your current password.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('Revoke all other sessions? You will be logged out everywhere except this device.')) return;
    setRevoking(true);
    try {
      await revokeSessions();
      setPwMessage({ ok: true, text: 'Other sessions revoked.' });
    } finally {
      setRevoking(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Deactivate your account? You can restore it later by signing back in.')) return;
    try {
      await deactivateAccount();
      logout();
      navigate('/');
    } catch {
      setPwMessage({ ok: false, text: 'Could not deactivate account. Try again.' });
    }
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const reheatmap = useMemo(() => {
    const weeks = 13;
    const today = new Date();
    const todayMon = (today.getDay() + 6) % 7;
    const start = new Date(today);
    start.setDate(start.getDate() - todayMon - (weeks - 1) * 7);
    const cells: Array<{ date: Date; key: string; count: number }> = [];
    for (let w = 0; w < weeks; w++) {
      for (let r = 0; r < 7; r++) {
        const d = new Date(start);
        d.setDate(start.getDate() + w * 7 + r);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        cells.push({ date: d, key, count: heatmap.days.get(key) || 0 });
      }
    }
    return cells;
  }, [heatmap]);

  const avatarEl = avatarPreview ? (
    <img src={resolveUploadUrl(avatarPreview)} alt="Avatar" className="h-20 w-20 rounded-full object-cover ring-4 ring-white/20 sm:h-24 sm:w-24" />
  ) : (
    <DefaultAvatar gender={gender} size={96} className="rounded-full ring-4 ring-white/20" />
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 transition-colors dark:bg-slate-950 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* ===== 1 · Profile Header ===== */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a5f] via-[#16304f] to-[#0f2340] p-6 shadow-lg sm:p-8 dark:from-[#16283f] dark:via-[#122036] dark:to-[#0a1526]">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-16 -left-8 h-48 w-48 rounded-full bg-yellow-400/10" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <div className="relative shrink-0 self-start">
                {avatarEl}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-indigo-600 text-white shadow-md transition hover:bg-indigo-700 dark:border-slate-900"
                  aria-label="Change profile picture"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">{user?.name || name || 'Your Profile'}</h1>
                  {user?.role === 'admin' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                      <Sparkles className="h-3 w-3" /> Admin
                    </span>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-blue-200">
                  <Mail className="h-3.5 w-3.5" /> {user?.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 font-medium text-blue-100">
                    <GraduationCap className="h-3.5 w-3.5" /> {classLevel ? getClassLabel(classLevel) : 'Class not set'}
                  </span>
                  {institution && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 font-medium text-blue-100">
                      <Building2 className="h-3.5 w-3.5" /> {institution}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 font-medium text-blue-100">
                    <Clock className="h-3.5 w-3.5" /> Member since {user?.createdAt ? new Date(user.createdAt).getFullYear() : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Quick Nav ===== */}
          <div className="sticky top-14 z-30 -mx-4 mt-6 overflow-x-auto bg-slate-50/90 px-4 py-3 backdrop-blur dark:bg-slate-950/90 sm:top-16">
            <div className="flex w-max gap-2">
              {[
                ['profile-personal', 'Personal'],
                ['profile-academic', 'Academic'],
                ['profile-learning', 'Learning'],
                ['profile-progress', 'Progress'],
                ['profile-badges', 'Badges'],
                ['profile-streak', 'Streak'],
                ['profile-activity', 'Activity'],
                ['profile-performance', 'Performance'],
                ['profile-strengths', 'Strengths'],
                ['profile-certificate', 'Certificate'],
                ['profile-security', 'Security'],
                ['profile-notifications', 'Notifications'],
                ['profile-appearance', 'Appearance'],
                ['profile-privacy', 'Privacy'],
                ['profile-subscription', 'Subscription'],
                ['profile-help', 'Help'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="shrink-0 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ===== 2 · Personal Information ===== */}
        <Section id="profile-personal" icon={User} title="Personal Information" subtitle="Your contact details, saved to your account" right={savedFlash && (
          <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> Saved
          </span>
        )}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" icon={User}>
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Your full name" />
            </Field>
            <Field label="Email Address (read-only)" icon={Mail}>
              <div className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">{user?.email || '—'}</div>
            </Field>
            <Field label="Phone" icon={Phone}>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} placeholder="+233 ..." inputMode="tel" />
            </Field>
            <Field label="Username" icon={AtSign}>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} placeholder="Optional username" />
            </Field>
            <Field label="Gender" icon={User}>
              <select value={gender} onChange={(e) => setGender(e.target.value as 'male' | 'female' | '')} className={cn(inputCls, 'capitalize')}>
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Date of Birth" icon={Calendar}>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <button
            onClick={savePersonal}
            disabled={savingPersonal}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
          >
            {savingPersonal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {savingPersonal ? 'Saving...' : 'Save Changes'}
          </button>
        </Section>

        {/* ===== 3 · Academic Information ===== */}
        <Section id="profile-academic" icon={GraduationCap} title="Academic Information" subtitle="Class level and subjects on PASSCO">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Current Class Level</label>
              <select value={classLevel} onChange={(e) => { setClassLevel(e.target.value); updateProfile({ classLevel: e.target.value }).catch(() => {}); }} className={cn(inputCls, 'capitalize')}>
                <option value="">Select class...</option>
                {(['jhs1', 'jhs2', 'jhs3'] as const).map((c) => (
                  <option key={c} value={c}>{getClassLabel(c)}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Your class level determines the questions you'll be asked.</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Subjects Covered</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SUBJECT_META) as SubjectId[]).map((sub) => {
                  const covered = stats.subjectsCovered > 0 && subjectStats.some((s) => s.subject === sub);
                  const Icon = SUBJECT_META[sub].icon;
                  return (
                    <span
                      key={sub}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition',
                        covered
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      {SUBJECT_META[sub].label}
                      {covered && <Check className="h-3 w-3" />}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* ===== 4 · Learning Overview ===== */}
        <Section id="profile-learning" icon={BarChart3} title="Learning Overview" subtitle="Your numbers at a glance">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile icon={BarChart3} value={stats.total} label="Assessments" gradient="from-blue-500 to-indigo-600" />
            <StatTile icon={TrendingUp} value={stats.avgScore} suffix="%" label="Avg Score" gradient="from-emerald-500 to-teal-600" />
            <StatTile icon={Zap} value={stats.passRate} suffix="%" label="Pass Rate" gradient="from-amber-500 to-orange-600" />
            <StatTile icon={Target} value={stats.bestScore} suffix="%" label="Best Score" gradient="from-rose-500 to-pink-600" />
            <StatTile icon={Clock} value={formatDuration(stats.totalTimeSpent)} label="Time Spent" gradient="from-violet-500 to-purple-600" />
            <StatTile icon={BookOpen} value={stats.subjectsCovered} label={`of ${Object.keys(SUBJECT_META).length} Subjects`} gradient="from-cyan-500 to-blue-600" />
          </div>
          {loadingData && <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your learning data...</p>}
        </Section>

        {/* ===== 5 · Overall Progress ===== */}
        <Section id="profile-progress" icon={Activity} title="Overall Progress" subtitle="Badges earned and subject mastery"
          right={<span className="text-sm font-bold text-slate-900 dark:text-white">{badgeSummary.earnedCount}/{badgeSummary.totalBadges}</span>}>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${badgeSummary.totalBadges > 0 ? (badgeSummary.earnedCount / badgeSummary.totalBadges) * 100 : 0}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {badgeSummary.earnedCount === badgeSummary.totalBadges
              ? 'Congratulations! You have earned every badge.'
              : `${badgeSummary.totalBadges - badgeSummary.earnedCount} badge(s) remaining in your collection.`}
          </p>
          <div className="mt-6 space-y-3">
            {subjectStats.length === 0 && <p className="text-sm text-slate-400">Complete an assessment to start tracking subject mastery.</p>}
            {subjectStats.map((s) => (
              <div key={s.subject}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300"><s.icon className="h-4 w-4" aria-hidden="true" /> {s.label}</span>
                  <span className={cn('font-bold', s.avgPct >= 75 ? 'text-emerald-600 dark:text-emerald-400' : s.avgPct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500')}>{s.avgPct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <motion.div
                    className={cn('h-full rounded-full', s.avgPct >= 75 ? 'bg-emerald-500' : s.avgPct >= 50 ? 'bg-amber-400' : 'bg-rose-400')}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.avgPct}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ===== 6 · Achievements & Badges ===== */}
        <Section id="profile-badges" icon={Trophy} title="Achievements & Badges" subtitle="Your hard-earned milestones"
          right={
            <Link to="/achievements" className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }>
          {badgeSummary.badges.filter((b) => b.earned).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <Medal className="mx-auto mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No badges yet. Complete assessments to earn your first one!</p>
              <Link to="/assessment/setup" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Take Assessment <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {badgeSummary.badges.filter((b) => b.earned).slice(0, 8).map((b) => (
                <div key={b.id} className={cn('rounded-xl border-2 p-3.5', TIER_STYLES[b.tier], 'shadow-sm')}>
                  <div className={cn('mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', TIER_STYLES[b.tier])}>
                    <Medal className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold leading-snug text-white">{b.name}</p>
                  <p className="mt-1 text-[10px] text-white/80 capitalize">{b.tier}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ===== 7 · Learning Streak ===== */}
        <Section id="profile-streak" icon={Flame} title="Learning Streak" subtitle="Consistency is a superpower">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5 dark:border-slate-800 dark:from-orange-500/10 dark:to-amber-500/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/25">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{streaks.current}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Current streak</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5 dark:border-slate-800 dark:from-amber-500/10 dark:to-yellow-500/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/25">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{streaks.best}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Best streak</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-5 dark:border-slate-800 dark:from-slate-500/10 dark:to-slate-500/10">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-lg">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.completed}</p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Assessments completed</p>
              </div>
            </div>
          </div>
          <p className="mb-3 hidden text-xs font-medium text-slate-500 sm:block dark:text-slate-400">Last 13 weeks of activity</p>
          <div className="overflow-x-auto">
            <div className="flex w-max items-end gap-[3px]">
              {Array.from({ length: 13 }, (_, w) => (
                <div key={w} className="flex flex-col gap-[3px]">
                  {reheatmap.slice(w * 7, w * 7 + 7).map((cell) => (
                    <div
                      key={cell.key}
                      title={cell.count > 0 ? `${cell.key}: ${cell.count} assessment(s)` : cell.key}
                      className={cn(
                        'h-3 w-3 rounded-[4px] sm:h-3.5 sm:w-3.5',
                        cell.count === 0 && 'bg-slate-100 dark:bg-slate-800',
                        cell.count === 1 && 'bg-emerald-200 dark:bg-emerald-500/30',
                        cell.count === 2 && 'bg-emerald-400 dark:bg-emerald-500/60',
                        cell.count >= 3 && 'bg-emerald-600 dark:bg-emerald-500'
                      )}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Less</span>
            <span className="h-3 w-3 rounded-[4px] bg-slate-100 dark:bg-slate-800" />
            <span className="h-3 w-3 rounded-[4px] bg-emerald-200 dark:bg-emerald-500/30" />
            <span className="h-3 w-3 rounded-[4px] bg-emerald-400 dark:bg-emerald-500/60" />
            <span className="h-3 w-3 rounded-[4px] bg-emerald-600 dark:bg-emerald-500" />
            <span>More</span>
          </div>
        </Section>

        {/* ===== 8 · Recent Activity ===== */}
        <Section id="profile-activity" icon={Activity} title="Recent Activity" subtitle="The latest assessments you've taken">
          {all.length === 0 ? (
            <p className="text-sm text-slate-400">No activity yet. Take an assessment to see it here.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {all.slice(0, 10).map((a, i) => (
                <li key={i} className="flex items-start gap-3 py-3">
                  <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm', a.passed ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-pink-600')}>
                    {a.passed ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Scored <span className={cn('font-bold', a.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500')}>{a.percentage}%</span> · {a.subject ? getSubjectLabel(a.subject) : 'Assessment'} · {getAssessmentTypeLabel(a.assessmentType)}
                    </p>
                    <p className="text-xs text-slate-400">{a.grade || ''} · {new Date(a.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {getClassLabel(a.classLevel)}</p>
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ===== 9 · Performance Summary ===== */}
        <Section id="profile-performance" icon={TrendingUp} title="Performance Summary" subtitle="Progress over time and by subject"
          right={
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/50">
              {RANGES.map((r) => (
                <button
                  key={r.label}
                  onClick={() => setRange(r.days)}
                  className={cn('rounded-lg px-2.5 py-1.5 text-xs font-semibold transition', range === r.days ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400')}
                >
                  {r.label}
                </button>
              ))}
            </div>
          }>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Cumulative average score</p>
              <div className="h-56">
                {timeSeries.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400 dark:border-slate-700">
                    No assessments in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeries}>
                      <defs>
                        <linearGradient id="pctGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} tickMargin={6} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                      <Tooltip />
                      <Area type="monotone" dataKey="pct" name="Avg Score" stroke="#6366f1" strokeWidth={2} fill="url(#pctGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">Average score by subject</p>
              <div className="h-56">
                {subjectChart.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400 dark:border-slate-700">
                    No subject data yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" vertical={false} />
                      <XAxis dataKey="subject" tick={{ fontSize: 9 }} tickMargin={6} interval={0} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                      <Tooltip />
                      <Bar dataKey="avg" name="Avg Score" radius={[6, 6, 0, 0]}>
                        {subjectChart.map((entry, i) => (
                          <Cell key={i} fill={SUBJECT_CHART_COLORS[i % SUBJECT_CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* ===== 10 · Strengths & Areas to Improve ===== */}
        <Section id="profile-strengths" icon={Target} title="Strengths & Areas to Improve" subtitle="Where you're strong and where to focus next">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-800 dark:bg-emerald-500/5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" /> Strengths
              </p>
              {strengths.length === 0 && <p className="text-xs text-emerald-600/70 dark:text-emerald-500/60">Keep practising — your strengths will show up here once you average 75%+ in a subject.</p>}
              <ul className="space-y-2">
                {strengths.map((s) => (
                  <li key={s.subject} className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white px-3.5 py-2.5 dark:border-emerald-800 dark:bg-slate-900">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"><s.icon className="h-4 w-4" aria-hidden="true" /> {s.label}</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{s.avgPct}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 dark:border-rose-800 dark:bg-rose-500/5">
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-700 dark:text-rose-400">
                <AlertCircle className="h-4 w-4" /> Areas to Improve
              </p>
              {improvements.length === 0 && <p className="text-xs text-rose-600/70 dark:text-rose-500/60">No weak areas right now — nice work!</p>}
              <ul className="space-y-2">
                {improvements.map((s) => (
                  <li key={s.subject} className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 dark:border-rose-800 dark:bg-slate-900">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200"><s.icon className="h-4 w-4" aria-hidden="true" /> {s.label}</span>
                    <Link to="/assessment/setup" className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700">
                      Practice
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {developing.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <BookOpen className="h-3.5 w-3.5" /> Developing subjects
              </p>
              <div className="flex flex-wrap gap-2">
                {developing.map((s) => (
                  <span key={s.subject} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                    <s.icon className="h-3.5 w-3.5" aria-hidden="true" /> {s.label} · {s.avgPct}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ===== 11 · Certificates ===== */}
        <Section id="profile-certificate" icon={Award} title="Certificates" subtitle="The A+ Excellence Certificate">
          {certApproved ? (
            <div className="flex flex-col gap-4 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 sm:flex-row sm:items-center dark:border-emerald-800 dark:from-emerald-500/10 dark:to-teal-500/10">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-slate-900 dark:text-white">Certificate approved! 🎓</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Certificate code: <span className="font-mono font-semibold">{certRequest?.certificateCode || ''}</span> — view and print it from the Achievements page.
                </p>
              </div>
              <Link to="/achievements" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1e3a5f] to-[#0f2340] px-5 py-2.5 text-sm font-semibold text-yellow-400 shadow-lg transition hover:shadow-xl">
                View Certificate <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : certPending ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:flex-row sm:items-center dark:border-amber-800 dark:bg-amber-500/10">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-slate-900 dark:text-white">Certificate request pending review</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Submitted {new Date(certRequest?.requestedAt || '').toLocaleDateString()}. We'll notify you once an admin approves or rejects it.
                </p>
              </div>
            </div>
          ) : certRequest?.status === 'rejected' ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-500/10">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg">
                <AlertCircle className="h-7 w-7" />
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-slate-900 dark:text-white">Certificate request declined</p>
                {certRequest?.adminNote ? (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{certRequest.adminNote}</p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">You can request again once you meet the requirements.</p>
                )}
              </div>
            </div>
          ) : eligible ? (
            <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-700 dark:bg-emerald-500/10">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">You're eligible!</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Submit a request and an admin will issue your A+ Excellence Certificate.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ReqRow label="Average score" value={`${stats.avgScore}%`} met={stats.avgScore >= 70} />
                <ReqRow label="Completed assessments" value={`${stats.completed}`} met={stats.completed >= 20} />
              </div>
              <button
                onClick={requestCertificate}
                disabled={requestBusy}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1e3a5f] to-[#0f2340] px-5 py-2.5 text-sm font-semibold text-yellow-400 shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {requestBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
                {requestBusy ? 'Submitting...' : 'Request Certificate'}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 text-white">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">A+ Excellence Certificate</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Score 70%+ average across 20+ completed assessments</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ReqRow label="Average score" value={`${stats.avgScore}%`} met={stats.avgScore >= 70} />
                <ReqRow label="Completed assessments" value={`${stats.completed}`} met={stats.completed >= 20} />
              </div>
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Keep it up — you're getting there!</p>
            </div>
          )}
        </Section>

        {/* ===== 12 · Account Security ===== */}
        <Section id="profile-security" icon={Shield} title="Account Security" subtitle="Password, sessions and recent security activity">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="space-y-5">
              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white"><KeyRound className="h-4 w-4 text-indigo-500" /> Change Password</p>
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <div className="relative">
                    <input type={showPasswords ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" required className={cn(inputCls, 'pr-10')} />
                  </div>
                  <div className="relative">
                    <input type={showPasswords ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" required className={cn(inputCls, 'pr-10')} />
                  </div>
                  <div className="relative">
                    <input type={showPasswords ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required className={cn(inputCls, 'pr-10')} />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-300"
                      aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button type="submit" disabled={savingPassword} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60">
                    {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
                {pwMessage && (
                  <p className={cn('mt-3 flex items-center gap-2 text-xs font-medium', pwMessage.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {pwMessage.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {pwMessage.text}
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">Revoke other sessions</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Logs out every device except this one</p>
                    </div>
                  </div>
                  <button onClick={handleRevoke} disabled={revoking} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                    {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {revoking ? 'Revoking...' : 'Revoke'}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white"><Clock className="h-4 w-4 text-indigo-500" /> Recent Security Activity</p>
              {securityFeed.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400 dark:border-slate-700">
                  No security events logged yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {securityFeed.map((entry) => {
                    const meta = ACTIVITY_META[entry.action] || { label: entry.action, Icon: Activity, color: 'text-slate-500 dark:text-slate-300' };
                    const Icon = meta.Icon;
                    return (
                      <li key={entry.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                        <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800', meta.color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{meta.label}</p>
                          <p className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString()}{entry.ip_address ? ` · ${entry.ip_address}` : ''}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button onClick={handleDeactivate} className="text-xs font-semibold text-rose-500 transition hover:text-rose-600 dark:text-rose-400">
              Deactivate account
            </button>
          </div>
        </Section>

        {/* ===== 13 · Notification Preferences ===== */}
        <Section id="profile-notifications" icon={Bell} title="Notification Preferences" subtitle="Choose what we email or notify you about">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {NOTIF_LIST.map((n) => (
              <div key={n.key} className="py-3">
                <Toggle checked={!!(notifPrefs as Record<string, boolean>)[n.key]} onChange={(v) => togglePref('notifications', n.key, v)} label={n.label} desc={n.desc} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">These are saved to your account and synced across devices.</p>
        </Section>

        {/* ===== 14 · Appearance Preferences ===== */}
        <Section id="profile-appearance" icon={Palette} title="Appearance Preferences" subtitle="Choose how PASSCO looks for you">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([
              { value: 'light', label: 'Light', hint: 'Bright and clean' },
              { value: 'dark', label: 'Dark', hint: 'Easy on the eyes' },
              { value: 'system', label: 'System', hint: 'Follow your device' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMode(opt.value)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition',
                  mode === opt.value
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-600'
                )}
              >
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', mode === opt.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
                  {mode === opt.value ? <Check className="h-4 w-4" /> : opt.value === 'dark' ? <MoonIcon /> : opt.value === 'light' ? <SunIcon /> : <MonitorIcon />}
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-800 dark:text-white">{opt.label}</span>
                  <span className="block text-xs text-slate-400">{opt.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* ===== 15 · Privacy ===== */}
        <Section id="profile-privacy" icon={Shield} title="Privacy" subtitle="Control how your data is used">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {PRIVACY_LIST.map((p) => (
              <div key={p.key} className="py-3">
                <Toggle checked={!!(privacyPrefs as Record<string, boolean>)[p.key]} onChange={(v) => togglePref('privacy', p.key, v)} label={p.label} desc={p.desc} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">Some privacy settings apply to features that are still rolling out. No ad trackers, ever.</p>
        </Section>

        {/* ===== 16 · Subscription ===== */}
        <Section id="profile-subscription" icon={CreditCard} title="Subscription & Plan" subtitle="Your PASSCO plan and benefits"
          right={
            <button onClick={refreshSubscription} disabled={subLoading} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              <RefreshCw className={cn('h-3.5 w-3.5', subLoading && 'animate-spin')} /> Refresh
            </button>
          }>
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-[#1e3a5f] to-[#0f2340] p-6 sm:flex-row sm:items-center dark:border-slate-800">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xl font-bold capitalize text-white">{effectivePlan} plan</p>
                {isTrial && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                    <Sparkles className="h-3 w-3" /> {trialDaysLeft} day trial left
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-blue-200">
                {subscription?.expires_at
                  ? `Renews / expires ${new Date(subscription.expires_at).toLocaleDateString()}`
                  : isTrial ? 'Your 3-day premium trial is active.' : 'Everything you need to practise and prepare.'}
              </p>
            </div>
            <Link to="/subscription" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-2.5 text-sm font-bold text-[#1e3a5f] shadow-lg transition hover:shadow-xl">
              {effectivePlan === 'free' ? 'Upgrade' : 'Manage'} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Mock tests', ok: effectivePlan !== 'free' || !!planLimits?.mocks },
              { label: 'Full examinations', ok: effectivePlan !== 'free' || !!planLimits?.examinations },
              { label: 'Document uploads', ok: effectivePlan !== 'free' || !!planLimits?.documentUploads },
              { label: 'AI question pack', ok: effectivePlan !== 'free' || (planLimits?.aiQuestions ?? 0) > 0 },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
                {f.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <X className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />}
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{f.label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ===== 17 · Help & Support ===== */}
        <Section id="profile-help" icon={HelpCircle} title="Help & Support" subtitle="Stuck? We're here to help">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link to="/contact?subject=Report+a+Question" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"><AlertCircle className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Report a Question</p>
                <p className="text-xs text-slate-400">Flag a wrong question, or use ⋯ Report during an assessment</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            </Link>
            <a href="mailto:support@passco.app" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"><Mail className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Email Support</p>
                <p className="text-xs text-slate-400">support@passco.app · replies within ~24h</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            </a>
            <a href="https://wa.me/233207435678" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><MessageCircle className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">WhatsApp</p>
                <p className="text-xs text-slate-400">+233 20 743 5678 · fastest for exam-day issues</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            </a>
            <Link to="/faq" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"><HelpCircle className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">FAQ</p>
                <p className="text-xs text-slate-400">Common questions, answered</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
            </Link>
          </div>
        </Section>

        {/* Log Out */}
        <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Log Out of Passco</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">You can sign back in anytime with your email and password.</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        </div>
      </div>

      {cropImageSrc && (
        <ImageCropper imageSrc={cropImageSrc} onCrop={handleCropConfirm} onCancel={() => setCropImageSrc(null)} />
      )}
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

function Section({ id, icon: Icon, title, subtitle, right, children }: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {right}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </label>
      {children}
    </div>
  );
}

function StatTile({ icon: Icon, value, suffix, label, gradient }: { icon: React.ComponentType<{ className?: string }>; value: string | number; suffix?: string; label: string; gradient: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', gradient)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="truncate text-xl font-bold text-slate-900 dark:text-white">
        {value}{suffix || ''}
      </p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 text-left">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        {desc && <p className="text-xs text-slate-400 dark:text-slate-500">{desc}</p>}
      </div>
      <span className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700')}>
        <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </span>
    </button>
  );
}

function ReqRow({ label, value, met }: { label: string; value: string; met: boolean }) {
  return (
    <div className={cn('flex items-center justify-between rounded-xl border px-3.5 py-2.5', met ? 'border-emerald-200 bg-white dark:border-emerald-800 dark:bg-slate-900' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900')}>
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
        {value} {met && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
      </span>
    </div>
  );
}

function getSubjectLabel(subject: string): string {
  const meta = SUBJECT_META[subject as SubjectId];
  if (meta) return meta.label;
  const match = Object.entries(SUBJECT_META).find(([, m]) => m.label.toLowerCase() === (subject || '').trim().toLowerCase());
  return match ? match[1].label : subject || 'Assessment';
}

// Minimal local sun/moon/monitor glyphs for appearance selector
function SunIcon() { return <span className="text-base leading-none">☀</span>; }
function MoonIcon() { return <span className="text-base leading-none">🌙</span>; }
function MonitorIcon() { return <span className="text-base leading-none">🖥</span>; }