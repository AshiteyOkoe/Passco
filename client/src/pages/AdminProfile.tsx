import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Camera, Loader2, Upload, Shield, ShieldCheck, Lock, KeyRound, Smartphone, Laptop, Activity,
  BellRing, UserX, RefreshCcw, Trash2, LogOut, AlertTriangle, Check, CheckCircle2,
  ChevronRight, Download, Database, Link2, Palette, Mail, X, Fingerprint, Globe, Clock,
  User as UserIcon, Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme, type ThemeMode } from '../context/ThemeContext';
import { fadeUp } from '../utils/animations';
import { cn } from '../utils';
import SectionCard from '../components/admin/SectionCard';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import ImageCropper from '../components/ImageCropper';
import { DefaultAvatar } from '../components/DefaultAvatars';
import {
  resolveUploadUrl, getMyActivity, getProfile, changePassword,
  revokeSessions, deactivateAccount, deleteAccount, type AuditLogEntry,
} from '../services/api';
import type { User } from '../types';

const SECTIONS = [
  { id: 'picture', label: 'Picture' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'security', label: 'Security' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'security-activity', label: 'Security Activity' },
  { id: 'admin-activity', label: 'Admin Activity' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'email', label: 'Email & Communication' },
  { id: 'connected', label: 'Connected Accounts' },
  { id: 'data', label: 'Data & Privacy' },
  { id: 'danger', label: 'Danger Zone' },
];

const ROLE_PERMISSIONS = [
  'Manage Users', 'Manage Teachers', 'Manage Classes', 'Manage Subjects',
  'Manage Questions', 'Manage Exams', 'View Results', 'Manage Resources',
  'Manage Subscriptions', 'Manage Platform Settings',
];

const SECURITY_ACTIONS = new Set([
  'login', 'login_failed', 'password_changed', 'sessions_revoked',
  'account_deactivated', 'account_deleted', 'avatar_updated',
]);

const ADMIN_ACTIVITY_LABELS: Record<string, string> = {
  profile_updated: 'Updated your profile details',
  approve_question: 'Approved a question',
  delete_student: 'Deleted a student account',
  suspend_user: 'Suspended a user',
  payment_verified: 'Verified a payment',
  register: 'Registered an account',
  generate_questions: 'Generated questions',
  create_announcement: 'Created an announcement',
};

const SECURITY_ACTIVITY_LABELS: Record<string, string> = {
  login: 'Successful login',
  login_failed: 'Failed login attempt',
  password_changed: 'Password changed',
  avatar_updated: 'Profile picture updated',
  sessions_revoked: 'All sessions signed out',
  account_deactivated: 'Account deactivated',
  account_deleted: 'Account deleted',
};

const TIMEZONES = ['Africa/Accra', 'UTC', 'Europe/London', 'Europe/Lisbon', 'America/New_York'];
const LANGUAGES = ['English', 'French'];

function fmt(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function fmtShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function getErr(e: unknown): string {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message || err?.message || 'Something went wrong. Please try again.';
}

function deviceInfo(): string {
  const ua = navigator.userAgent;
  const os = /Windows/i.test(ua) ? 'Windows'
    : /Mac/i.test(ua) ? 'macOS'
    : /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad/i.test(ua) ? 'iOS'
    : /Linux/i.test(ua) ? 'Linux' : 'Unknown OS';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /Chrome/.test(ua) ? 'Chrome'
    : /Firefox/.test(ua) ? 'Firefox'
    : /Safari/.test(ua) ? 'Safari' : 'Browser';
  return `${os} \u00b7 ${browser}`;
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function Flash({ msg, ok }: { msg: { ok: boolean; text: string } | null; ok: boolean }) {
  if (!msg) return null;
  return (
    <div
      className={cn(
        'mb-4 flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm',
        msg.ok
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400'
      )}
    >
      {msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
      <span>{msg.text}</span>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';

export default function AdminProfile() {
  const navigate = useNavigate();
  const { user: authUser, logout, updateProfile: authUpdateProfile, updateAvatar: authUpdateAvatar } = useAuth();
  const { mode, setMode } = useTheme();

  const [profile, setProfile] = useState<User | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activity, setActivity] = useState<AuditLogEntry[]>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [avatar, setAvatar] = useState('');
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [prefs, setPrefs] = useState<{
    notifications: Record<string, boolean>;
    email: { notificationEmail: string; marketingAnnouncements: boolean };
    appearance: { density: 'comfortable' | 'compact' };
  }>({
    notifications: {},
    email: { notificationEmail: '', marketingAnnouncements: false },
    appearance: { density: 'comfortable' },
  });
  const [timezone, setTimezone] = useState('Africa/Accra');
  const [language, setLanguage] = useState('English');
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [revokeOpen, setRevokeOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [dangerBusy, setDangerBusy] = useState(false);
  const [dangerMsg, setDangerMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const securityActivity = useMemo(
    () => activity.filter((a) => SECURITY_ACTIONS.has(a.action)).slice(0, 10),
    [activity]
  );
  const adminActivity = useMemo(
    () => activity.filter((a) => !SECURITY_ACTIONS.has(a.action)).slice(0, 10),
    [activity]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const p = await getProfile();
        if (!mounted) return;
        setProfile(p);
        setName(p.name || '');
        setEmail(p.email || '');
        setPhone(p.phone || '');
        setUsername(p.username || '');
        setJobTitle(p.jobTitle || '');
        setDepartment(p.department || '');
        setAvatar(p.avatar || '');
        setTimezone(p.timezone || 'Africa/Accra');
        setLanguage(p.language || 'English');
        const base = {
          notifications: {
            newUserRegistrations: true, verificationRequests: true, examinationAlerts: true,
            systemErrors: true, subscriptionNotifications: true, securityAlerts: true,
            adminAlerts: true, weeklyReport: true,
          },
          email: { notificationEmail: p.email || '', marketingAnnouncements: false },
          appearance: { density: 'comfortable' as const },
        };
        const stored = (p.preferences || {}) as Record<string, any>;
        setPrefs({
          notifications: { ...base.notifications, ...(stored.notifications || {}) },
          email: { ...base.email, ...(stored.email || {}) },
          appearance: { ...base.appearance, ...(stored.appearance || {}) },
        });
        setActivity(await getMyActivity(p.id));
      } catch {
        if (mounted) setProfile(authUser || null);
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  async function persistPrefs(next: typeof prefs, tz = timezone, lang = language) {
    setSavingPrefs(true);
    try {
      const user = await authUpdateProfile({ preferences: next as Record<string, unknown>, timezone: tz, language: lang });
      setProfile(user);
    } catch (e) {
      setSaveMsg({ ok: false, text: getErr(e) });
    } finally {
      setSavingPrefs(false);
    }
  }

  function togglePref(group: 'notifications' | 'email', field: string, value: boolean) {
    const next = { ...prefs, [group]: { ...prefs[group], [field]: value } };
    setPrefs(next);
    void persistPrefs(next);
  }

  function setDensity(density: 'comfortable' | 'compact') {
    const next = { ...prefs, appearance: { ...prefs.appearance, density } };
    setPrefs(next);
    void persistPrefs(next);
  }

  function handleTimezone(tz: string) {
    setTimezone(tz);
    void persistPrefs(prefs, tz);
  }

  function handleLanguage(lang: string) {
    setLanguage(lang);
    void persistPrefs(prefs, timezone, lang);
  }

  async function savePersonalInfo() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const updated = await authUpdateProfile({ name, phone, username, jobTitle, department });
      setProfile(updated);
      setSaveMsg({ ok: true, text: 'Profile details saved successfully.' });
    } catch (e) {
      setSaveMsg({ ok: false, text: getErr(e) });
    } finally {
      setSaving(false);
    }
  }

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
      const url = await authUpdateAvatar(file);
      setAvatar(url);
    } catch {
      setSaveMsg({ ok: false, text: 'Failed to upload avatar.' });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      await authUpdateProfile({ avatar: '' });
      setAvatar('');
    } catch {
      setSaveMsg({ ok: false, text: 'Failed to remove avatar.' });
    } finally {
      setUploading(false);
    }
  };

  async function doChangePassword() {
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: 'New password and confirmation do not match.' });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ ok: false, text: 'New password must be at least 6 characters long.' });
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(curPw, newPw);
      setPwOpen(false);
      setCurPw(''); setNewPw(''); setConfirmPw('');
      setPwMsg({ ok: true, text: 'Password updated successfully.' });
    } catch (e) {
      setPwMsg({ ok: false, text: getErr(e) });
    } finally {
      setPwLoading(false);
    }
  }

  async function finishAction(fn: () => Promise<void>, close: () => void) {
    setDangerMsg('');
    setDangerBusy(true);
    try {
      await fn();
    } catch (e) {
      setDangerBusy(false);
      setDangerMsg(getErr(e));
      return;
    }
    close();
    logout();
    navigate('/');
  }

  function downloadData() {
    if (!profile) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      user: profile,
      recentActivity: activity.map((a) => ({
        action: a.action,
        event: SECURITY_ACTIONS.has(a.action) || ADMIN_ACTIVITY_LABELS[a.action] ? (SECURITY_ACTIVITY_LABELS[a.action] || ADMIN_ACTIVITY_LABELS[a.action]) : a.action,
        createdAt: a.created_at,
        ipAddress: a.ip_address || '',
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passco-account-data-${profile.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const roleLabel = authUser?.role === 'admin' ? 'Administrator' : authUser?.role === 'student' ? 'Student' : (authUser?.role || 'Member');

  if (loadingProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <button onClick={() => navigate('/admin')} className="mb-5 flex items-center gap-2 text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Command Center</span>
          </button>

          <div className="mb-6 flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">My Profile</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage your personal details, security, notifications, and account settings.
            </p>
          </div>

          <div className="sticky top-14 z-30 -mx-4 mb-6 overflow-x-auto border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:top-16">
            <div className="flex w-max gap-1.5">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollToSection(s.id)}
                  className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            {/* LEFT COLUMN */}
            <div className="space-y-5 lg:col-span-2">
              <SectionCard id="profile-header" title={roleLabel} subtitle="Account overview" icon={UserIcon}>
                <div className="flex items-center gap-4">
                  {avatar ? (
                    <img src={resolveUploadUrl(avatar)} alt="Avatar" className="h-16 w-16 rounded-full object-cover ring-4 ring-blue-100 dark:ring-blue-900" />
                  ) : (
                    <DefaultAvatar gender="" size={64} className="rounded-full ring-4 ring-blue-100 dark:ring-blue-900" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900 dark:text-white">{name || 'Administrator'}</p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{email}</p>
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                      <ShieldCheck className="h-3 w-3" /> Full access
                    </span>
                  </div>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><Clock className="h-3 w-3" /> Last login</dt>
                    <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">{fmt(profile?.lastLogin)}</dd>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                    <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><CheckCircle2 className="h-3 w-3" /> Member since</dt>
                    <dd className="mt-1 font-medium text-slate-700 dark:text-slate-200">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—'}</dd>
                  </div>
                </dl>
              </SectionCard>

              <SectionCard id="picture" title="Profile Picture" subtitle="Add a photo to personalise your account" icon={Upload}>
                <div className="flex flex-col items-center gap-5 sm:flex-row">
                  <div className="relative">
                    {avatar ? (
                      <img src={resolveUploadUrl(avatar)} alt="Avatar" className="h-24 w-24 rounded-full object-cover" />
                    ) : (
                      <DefaultAvatar gender="" size={96} className="rounded-full" />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex w-full flex-col gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <Camera className="h-4 w-4" /> Change photo
                    </button>
                    {avatar && (
                      <button
                        onClick={removeAvatar}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="h-4 w-4" /> Remove photo
                      </button>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard id="roles" title="Role & Permissions" subtitle="Assigned by the platform administrator" icon={Shield}>
                <ul className="space-y-2">
                  {ROLE_PERMISSIONS.map((p) => (
                    <li key={p} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Permissions are granted by your administrator role. To change them, contact the platform owner.
                </p>
              </SectionCard>

              <SectionCard id="sessions" title="Active Sessions" subtitle="Devices currently signed in" icon={Smartphone}>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <Laptop className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">This device</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{deviceInfo()}</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active now
                  </span>
                </div>
                <button
                  onClick={() => setRevokeOpen(true)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RefreshCcw className="h-4 w-4" /> Sign out this device
                </button>
              </SectionCard>

              <SectionCard id="connected" title="Connected Accounts" subtitle="Third-party logins linked to your account" icon={Link2}>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: '#4285F4' }}>G</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Google</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Sign in with Google is available</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">Available</span>
                  </li>
                  <li className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 p-3.5 opacity-70 dark:border-slate-700">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: '#0078D4' }}>M</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Microsoft</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Coming soon</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Planned</span>
                  </li>
                  <li className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 p-3.5 opacity-70 dark:border-slate-700">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ background: '#181717' }}>GH</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">GitHub</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Coming soon</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Planned</span>
                  </li>
                </ul>
              </SectionCard>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-5 lg:col-span-3">
              <SectionCard id="personal" title="Personal Information" subtitle="Update your contact and job details" icon={UserIcon}>
                <Flash msg={saveMsg} ok={saveMsg?.ok ?? false} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Full name</label>
                    <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Email address</label>
                    <input className={cn(inputCls, 'cursor-not-allowed bg-slate-50 dark:bg-slate-900')} value={email} disabled />
                    <p className="mt-1 text-[11px] text-slate-400">Used for sign-in. Not editable here.</p>
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 ___ ___ ___" />
                  </div>
                  <div>
                    <label className={labelCls}>Username</label>
                    <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@handle" />
                  </div>
                  <div>
                    <label className={labelCls}>Job title</label>
                    <input className={inputCls} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Head of Examinations" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Department / Institution</label>
                    <input className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Examinations Office" />
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={savePersonalInfo}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save changes
                  </button>
                </div>
              </SectionCard>

              <SectionCard id="security" title="Security" subtitle="Password, two-factor authentication, and login protection" icon={Lock}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><KeyRound className="h-5 w-5" /></span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Password</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Set a strong password you don't use elsewhere</p>
                      </div>
                    </div>
                    <button onClick={() => setPwOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                      Change
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Fingerprint className="h-5 w-5" /></span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Two-factor authentication</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Add an extra layer of security to your account</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">Upcoming</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Mail className="h-5 w-5" /></span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Email verified</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"><Check className="h-3 w-3" /> Verified</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3.5 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><BellRing className="h-5 w-5" /></span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Login notifications</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Email me when a new device signs in</p>
                      </div>
                    </div>
                    <Toggle checked={!!prefs.notifications.securityAlerts} onChange={(v) => togglePref('notifications', 'securityAlerts', v)} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard id="security-activity" title="Security Activity" subtitle="Sign-ins and security events on your account" icon={Activity}>
                {securityActivity.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No security events recorded yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {securityActivity.map((a) => (
                      <li key={a.id} className="flex items-center gap-3">
                        <span className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          a.action === 'login' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : a.action === 'login_failed' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        )}>
                          {a.action === 'login' ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{SECURITY_ACTIVITY_LABELS[a.action] || a.action}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{a.ip_address ? `IP ${a.ip_address} · ` : ''}{fmtShort(a.created_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => navigate('/admin/audit-logs')} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400">
                  View full audit log <ChevronRight className="h-4 w-4" />
                </button>
              </SectionCard>

              <SectionCard id="admin-activity" title="Admin Activity" subtitle="Actions you've taken across the platform" icon={Database}>
                {adminActivity.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No admin activity logged yet. Your management actions will appear here.</p>
                ) : (
                  <ul className="space-y-3">
                    {adminActivity.map((a) => (
                      <li key={a.id} className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                          <Shield className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{ADMIN_ACTIVITY_LABELS[a.action] || a.action}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{fmtShort(a.created_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              <SectionCard id="notifications" title="Notification Preferences" subtitle="Choose what you want to hear about" icon={BellRing}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Email notifications</p>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                  {[
                    ['newUserRegistrations', 'New user registrations'],
                    ['verificationRequests', 'Question verification requests'],
                    ['examinationAlerts', 'Examination alerts'],
                    ['systemErrors', 'System errors'],
                    ['subscriptionNotifications', 'Subscription & payment notifications'],
                  ].map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-slate-900">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                      <Toggle checked={!!prefs.notifications[key]} onChange={(v) => togglePref('notifications', key, v)} />
                    </div>
                  ))}
                </div>

                <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Push notifications</p>
                <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
                  <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-slate-900">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Security alerts</span>
                    <Toggle checked={!!prefs.notifications.securityAlerts} onChange={(v) => togglePref('notifications', 'securityAlerts', v)} />
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-slate-900">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Important administrative alerts</span>
                    <Toggle checked={!!prefs.notifications.adminAlerts} onChange={(v) => togglePref('notifications', 'adminAlerts', v)} />
                  </div>
                </div>

                <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reports</p>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">Weekly platform report</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">A summary of activity, sent every Monday</p>
                  </div>
                  <Toggle checked={!!prefs.notifications.weeklyReport} onChange={(v) => togglePref('notifications', 'weeklyReport', v)} />
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" /> Changes are saved automatically. {savingPrefs && <Loader2 className="h-3 w-3 animate-spin" />}
                </p>
              </SectionCard>

              <SectionCard id="appearance" title="Appearance" subtitle="Theme and interface preferences" icon={Palette}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Theme</p>
                <div className="mb-5 grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'system'] as ThemeMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={cn(
                        'rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition',
                        mode === m
                          ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Interface density</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDensity('comfortable')}
                        className={cn(
                          'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                          prefs.appearance.density === 'comfortable'
                            ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                        )}
                      >
                        Comfortable
                      </button>
                      <button
                        onClick={() => setDensity('compact')}
                        className={cn(
                          'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                          prefs.appearance.density === 'compact'
                            ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                        )}
                      >
                        Compact
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Language</label>
                    <select className={inputCls} value={language} onChange={(e) => handleLanguage(e.target.value)}>
                      {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Time zone</label>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                      <select className={inputCls} value={timezone} onChange={(e) => handleTimezone(e.target.value)}>
                        {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard id="email" title="Email & Communication" subtitle="Where you receive email and what you get" icon={Mail}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Primary email</label>
                    <input className={cn(inputCls, 'cursor-not-allowed bg-slate-50 dark:bg-slate-900')} value={email} disabled />
                  </div>
                  <div>
                    <label className={labelCls}>Notification email</label>
                    <input
                      className={inputCls}
                      value={prefs.email.notificationEmail}
                      onChange={(e) => setPrefs((prev) => ({ ...prev, email: { ...prev.email, notificationEmail: e.target.value } }))}
                      onBlur={() => {
                        if (prefs.email.notificationEmail !== (profile?.email || '')) {
                          void persistPrefs({ ...prefs, email: { ...prefs.email, notificationEmail: prefs.email.notificationEmail || profile?.email || '' } });
                        }
                      }}
                      placeholder="Leave blank to use your primary email"
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">Marketing & announcements</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Occasional platform news and product updates</p>
                  </div>
                  <Toggle checked={prefs.email.marketingAnnouncements} onChange={(v) => togglePref('email', 'marketingAnnouncements', v)} />
                </div>
              </SectionCard>

              <SectionCard id="data" title="Data & Privacy" subtitle="Your data, under your control" icon={Database}>
                <button
                  onClick={downloadData}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <Download className="h-4 w-4" /> Download My Data
                </button>
                <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  Downloads a JSON export of your account details and recent activity. Learn how Passco handles your data in the{' '}
                  <button className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Privacy Policy</button>.
                </p>
              </SectionCard>

              <SectionCard id="danger" title="Danger Zone" subtitle="Irreversible actions. Proceed with care." icon={AlertTriangle}>
                <Flash msg={dangerMsg ? { ok: false, text: dangerMsg } : null} ok={false} />
                <div className="overflow-hidden rounded-xl border border-rose-200 dark:border-rose-500/30">
                  <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-white px-4 py-3.5 dark:border-rose-500/30 dark:bg-slate-900">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Sign out everywhere</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Forces a sign-out on every device (including this one)</p>
                    </div>
                    <button onClick={() => { setDangerMsg(''); setRevokeOpen(true); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                      <RefreshCcw className="h-3.5 w-3.5" /> Sign out
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-b border-rose-200 bg-white px-4 py-3.5 dark:border-rose-500/30 dark:bg-slate-900">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Deactivate account</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Temporarily disable your account. You can be reactivated later.</p>
                    </div>
                    <button onClick={() => { setDangerMsg(''); setDeactivateOpen(true); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-300 px-3.5 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-400 dark:hover:bg-amber-500/10">
                      <UserX className="h-3.5 w-3.5" /> Deactivate
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-rose-50/50 px-4 py-3.5 dark:bg-slate-900">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">Delete account</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove your account and all associated data.</p>
                    </div>
                    <button onClick={() => { setDangerMsg(''); setDeleteOpen(true); }} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Change password modal */}
      <ConfirmDialog
        open={pwOpen}
        title="Change password"
        description="Enter your current password, then choose a strong new one."
        confirmLabel="Update password"
        loading={pwLoading}
        onConfirm={doChangePassword}
        onCancel={() => { setPwOpen(false); setPwMsg(null); }}
      >
        <div className="mt-5 space-y-3">
          <Flash msg={pwMsg} ok={pwMsg?.ok ?? false} />
          <input type="password" className={inputCls} placeholder="Current password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
          <input type="password" className={inputCls} placeholder="New password (min 6 characters)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <input type="password" className={inputCls} placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        </div>
      </ConfirmDialog>

      {/* Sign out everywhere */}
      <ConfirmDialog
        open={revokeOpen}
        title="Sign out everywhere?"
        description="This will invalidate your session on all devices, including this one. You'll need to log in again."
        confirmLabel="Sign out everywhere"
        tone="danger"
        loading={dangerBusy}
        onConfirm={() => finishAction(async () => { await revokeSessions(); }, () => setRevokeOpen(false))}
        onCancel={() => { setRevokeOpen(false); setDangerMsg(''); }}
      />

      {/* Deactivate account */}
      <ConfirmDialog
        open={deactivateOpen}
        title="Deactivate your account?"
        description="Your account will be disabled and you'll be signed out immediately. Contact the platform owner to reactivate."
        confirmLabel="Deactivate account"
        tone="danger"
        loading={dangerBusy}
        onConfirm={() => finishAction(async () => { await deactivateAccount(); }, () => setDeactivateOpen(false))}
        onCancel={() => { setDeactivateOpen(false); setDangerMsg(''); }}
      />

      {/* Delete account */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete your account permanently?"
        description={
          profile?.hasPassword
            ? "This action cannot be undone. All of your data will be removed. Type your password to confirm."
            : "This action cannot be undone. All of your data will be removed."
        }
        confirmLabel="Delete account"
        tone="danger"
        confirmDisabled={!!profile?.hasPassword && !delPw}
        loading={dangerBusy}
        onConfirm={() => finishAction(async () => { await deleteAccount(profile?.hasPassword ? delPw : 'confirm'); }, () => setDeleteOpen(false))}
        onCancel={() => { setDeleteOpen(false); setDelPw(''); setDangerMsg(''); }}
      >
        {profile?.hasPassword && (
          <div className="mt-5">
            <Flash msg={dangerMsg ? { ok: false, text: dangerMsg } : null} ok={false} />
            <input type="password" className={inputCls} placeholder="Enter your password" value={delPw} onChange={(e) => setDelPw(e.target.value)} />
          </div>
        )}
      </ConfirmDialog>

      {/* Avatar cropper */}
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