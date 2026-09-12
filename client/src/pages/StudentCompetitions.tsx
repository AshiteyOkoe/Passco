import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Plus, Users, Clock, ListChecks, Search, X, Sparkles, Swords,
  Check, Ban, ChevronRight, Loader2, Layers, Medal, PlayCircle, Mail,
  Building2, AtSign,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/toast/ToastProvider';
import AnimatedSpinner from '../components/AnimatedSpinner';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import { useModalA11y } from '../hooks/useModalA11y';
import { fadeUp } from '../utils/animations';
import { SUBJECT_META, CLASS_META } from '../data/questionBank';
import {
  createCompetition,
  getMyCompetitions,
  acceptCompetition,
  declineCompetition,
  cancelCompetition,
  searchCompetitionParticipants,
} from '../services/api';
import type { Competition, CompetitionStatus } from '../types';

const SUBJECT_LABEL: Record<string, { label: string; icon: typeof Layers }> = {
  all: { label: 'Mixed Subjects', icon: Layers },
  ...Object.fromEntries(
    Object.entries(SUBJECT_META).map(([key, meta]) => [key, { label: meta.label, icon: meta.icon }])
  ),
};

const STATUS_META: Record<CompetitionStatus, { label: string; chip: string }> = {
  pending: { label: 'Pending', chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  live: { label: 'Live', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  finished: { label: 'Finished', chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' },
  cancelled: { label: 'Cancelled', chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function CompetitionBadge({ status }: { status: CompetitionStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chip}`}>
      {meta.label}
    </span>
  );
}

function SubjectIcon({ subject, className = 'h-5 w-5' }: { subject: string; className?: string }) {
  const meta = SUBJECT_LABEL[subject] || SUBJECT_LABEL.all;
  const Icon = meta.icon;
  return <Icon className={className} aria-hidden="true" />;
}

export default function StudentCompetitions() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [tab, setTab] = useState<'invites' | 'active' | 'finished' | 'all'>('invites');
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Competition | null>(null);

  const load = useCallback(() => {
    getMyCompetitions()
      .then((res) => setCompetitions(res.competitions))
      .catch(() => {
        toast.error('Could not load competitions');
        setCompetitions([]);
      });
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openInvites = useMemo(
    () => (competitions ?? []).filter((c) => c.mine?.status === 'invited').length,
    [competitions]
  );

  const tabs = useMemo(() => {
    const list = competitions ?? [];
    const invites = list.filter((c) => c.mine?.status === 'invited');
    const active = list.filter((c) => c.status === 'live');
    const finished = list.filter((c) => c.status === 'finished');
    return {
      invites,
      active,
      finished,
      all: list,
    };
  }, [competitions]);

  const handleInvite = async (comp: Competition, action: 'accept' | 'decline') => {
    setBusyId(comp.id);
    try {
      if (action === 'accept') {
        await acceptCompetition(comp.id);
        toast.success('Invite accepted', 'You are in the competition.');
      } else {
        await declineCompetition(comp.id);
        toast.success('Invite declined', 'Noted.');
      }
      await load();
    } catch (e) {
      toast.error(action === 'accept' ? 'Could not accept invite' : 'Could not decline invite');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (comp: Competition) => {
    setBusyId(comp.id);
    try {
      await cancelCompetition(comp.id);
      toast.success('Competition cancelled');
      await load();
    } catch {
      toast.error('Could not cancel competition');
    } finally {
      setBusyId(null);
      setCancelTarget(null);
    }
  };

  const countFor = (key: 'invites' | 'active' | 'finished') => tabs[key].length;

  const current = tabs[tab];

  if (competitions === null) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <AnimatedSpinner label="Loading competitions..." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            <Swords className="h-4 w-4" aria-hidden="true" /> Head-to-head learning
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Quiz Competitions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Challenge up to 3 classmates and race against the clock. Highest score wins.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" aria-hidden="true" /> New Challenge
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Open invites', value: openInvites, icon: Mail, chip: 'text-indigo-500' },
          { label: 'Live now', value: countFor('active'), icon: PlayCircle, chip: 'text-emerald-500' },
          { label: 'Total challenges', value: tabs.all.length, icon: Trophy, chip: 'text-amber-500' },
          { label: 'Victories', value: tabs.all.filter((c) => c.winnerId === user?.id).length, icon: Medal, chip: 'text-violet-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={i}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                <stat.icon className={`h-5 w-5 ${stat.chip}`} aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none text-slate-900 dark:text-white">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ['invites', 'Invitations', countFor('invites')],
            ['active', 'Live', countFor('active')],
            ['finished', 'Finished', countFor('finished')],
            ['all', 'All', tabs.all.length],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key}
            className={`relative inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
              tab === key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs ${
                tab === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {current.length === 0 && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
              <Trophy className="h-7 w-7 text-indigo-500" aria-hidden="true" />
            </span>
            <p className="mt-4 text-base font-semibold text-slate-800 dark:text-white">
              {tab === 'invites' ? 'No invitations yet' : tab === 'active' ? 'Nothing live right now' : 'No finished competitions'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {tab === 'invites'
                ? 'When a classmate challenges you, it will show up here and in your notification bell.'
                : 'Create a challenge and invite up to 3 classmates to start your first competition.'}
            </p>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-5 inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5" aria-hidden="true" /> Create a challenge
            </button>
          </div>
        )}

        {current.map((comp, i) => (
          <motion.div
            key={comp.id}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={i}
            className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <SubjectIcon subject={comp.subject} className="h-6 w-6" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">{comp.title}</h3>
                <CompetitionBadge status={comp.status} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" />
                  {comp.participants.filter((p) => p.status !== 'declined' && p.status !== 'invited').length}/{comp.maxParticipants} players
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" aria-hidden="true" /> {comp.totalQuestions} questions
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {comp.timeMinutes} min each
                </span>
                {comp.winnerName && comp.status === 'finished' && (
                  <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                    <Medal className="h-3.5 w-3.5" aria-hidden="true" /> Won by {comp.winnerName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {comp.mine?.status === 'invited' && comp.status !== 'cancelled' && (
                <>
                  <button
                    type="button"
                    disabled={busyId === comp.id}
                    onClick={() => handleInvite(comp, 'accept')}
                    className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {busyId === comp.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                    Accept
                  </button>
                  <button
                    type="button"
                    disabled={busyId === comp.id}
                    onClick={() => handleInvite(comp, 'decline')}
                    aria-label={`Decline invitation to ${comp.title}`}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <Ban className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              )}

              {comp.status === 'live' && comp.mine && comp.mine.status !== 'finished' && comp.mine.status !== 'abandoned' && (
                <button
                  type="button"
                  onClick={() => navigate(`/competitions/${comp.id}`)}
                  className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <PlayCircle className="h-4 w-4" aria-hidden="true" /> Play
                </button>
              )}

              {comp.createdBy === user?.id && (comp.status === 'pending' || comp.status === 'live') && (
                <button
                  type="button"
                  onClick={() => setCancelTarget(comp)}
                  aria-label={`Cancel ${comp.title}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate(`/competitions/${comp.id}`)}
                aria-label={`View ${comp.title}`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <CreateCompetitionModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={async () => {
          await load();
          setTab('active');
        }}
      />
      <ConfirmDialog
        open={cancelTarget !== null}
        title="Cancel competition?"
        description={`“${cancelTarget?.title}” will be cancelled and all players will be notified. This cannot be undone.`}
        confirmLabel="Cancel competition"
        tone="danger"
        loading={busyId === cancelTarget?.id}
        onConfirm={() => cancelTarget && handleCancel(cancelTarget)}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}

function CreateCompetitionModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('all');
  const [classLevel, setClassLevel] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [timeMinutes, setTimeMinutes] = useState(10);
  const [invitees, setInvitees] = useState<Array<{ id: string; name: string; school: string; classLevel: string; username: string | null }>>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string; school: string; classLevel: string; username: string | null; avatar: string | null }>>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<number | undefined>(undefined);

  const { dialogRef } = useModalA11y(open, { onClose });

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      searchCompetitionParticipants(q)
        .then((res) => setResults(res.participants))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => window.clearTimeout(searchTimer.current);
  }, [query, open]);

  const addInvitee = (p: { id: string; name: string; school: string; classLevel: string; username: string | null }) => {
    if (invitees.some((i) => i.id === p.id)) return;
    if (invitees.length >= 3) {
      toast.error('Max 3 classmates', 'Competitions are limited to 4 players total.');
      return;
    }
    setInvitees((prev) => [...prev, p]);
    setQuery('');
    setResults([]);
  };

  const submit = async () => {
    if (invitees.length === 0) {
      toast.error('Invite a classmate', 'A competition needs the host plus at least one player.');
      return;
    }
    setSubmitting(true);
    try {
      await createCompetition({
        title: title.trim() || undefined,
        subject,
        classLevel: classLevel || undefined,
        totalQuestions,
        timeMinutes,
        inviteeIds: invitees.map((i) => i.id),
      });
      toast.success('Challenge created', 'Your classmates have been invited.');
      setInvitees([]);
      setTitle('');
      setTotalQuestions(10);
      setTimeMinutes(10);
      setSubject('all');
      setClassLevel('');
      onClose();
      await onCreated();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'Could not create challenge');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-competition-title"
        className="animate-sheet-up max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white pt-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 id="create-competition-title" className="text-lg font-bold text-slate-900 dark:text-white">
              New Quiz Challenge
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Host by {user?.name} · up to 4 players total
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="comp-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Title <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="comp-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder={`${user?.name?.split(' ')[0] || 'Your'} Challenge`}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="comp-subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Subject
              </label>
              <select
                id="comp-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">Mixed Subjects</option>
                {Object.entries(SUBJECT_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="comp-class" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Class level <span className="text-slate-400">(optional)</span>
              </label>
              <select
                id="comp-class"
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="">Any level</option>
                {Object.entries(CLASS_META).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Number of questions
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[10, 15, 20, 30].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTotalQuestions(n)}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition ${
                      totalQuestions === n
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <input
                  type="number"
                  min={5}
                  max={50}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value) || 1)}
                  aria-label="Number of questions"
                  className="h-9 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
            <div>
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Minutes per player
              </span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {[5, 10, 15].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTimeMinutes(n)}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-semibold transition ${
                      timeMinutes === n
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={timeMinutes}
                  onChange={(e) => setTimeMinutes(Number(e.target.value) || 1)}
                  aria-label="Minutes per player"
                  className="h-9 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm text-slate-900 outline-none transition focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Invite classmates <span className="text-slate-400">({invitees.length}/3 added)</span>
            </span>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, @username, or school…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden="true" />}
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <AtSign className="h-3.5 w-3.5" aria-hidden="true" />
              Search by name, @username, or school — school helps when names match.
            </p>

            {results.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                {results.map((p) => {
                  const already = invitees.some((i) => i.id === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={already}
                      onClick={() => addInvitee(p)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-slate-800"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {p.avatar ? (
                            <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold">{p.name.charAt(0)}</span>
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-800 dark:text-white">{p.name}</span>
                          <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                            {p.school && (
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span className="truncate">{p.school}</span>
                              </span>
                            )}
                            {p.username && (
                              <span className="inline-flex shrink-0 items-center gap-0.5">
                                <AtSign className="h-3 w-3" aria-hidden="true" />
                                {p.username}
                              </span>
                            )}
                            {(p.school || p.username) && <span aria-hidden="true">·</span>}
                            <span className="shrink-0">
                              {p.classLevel ? `JHS ${p.classLevel.slice(-1)}` : 'Student'}
                            </span>
                          </span>
                        </span>
                      </span>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {already ? 'Added' : 'Add'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {query.trim().length >= 2 && results.length === 0 && !searching && (
              <p className="mt-2 text-xs text-slate-400">No students found for “{query.trim()}”.</p>
            )}

            {invitees.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {invitees.map((inv) => (
                  <span
                    key={inv.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-sm font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300"
                  >
                    {inv.name}
                    <button
                      type="button"
                      onClick={() => setInvitees((prev) => prev.filter((i) => i.id !== inv.id))}
                      aria-label={`Remove ${inv.name}`}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-indigo-500 transition hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
            Send challenges
          </button>
        </div>
      </div>
    </div>
  );
}