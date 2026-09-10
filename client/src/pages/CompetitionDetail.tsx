import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Trophy, Users, Clock, ListChecks, PlayCircle, Check, Ban,
  Loader2, Crown, Medal, Timer, Star, X, Layers,
} from 'lucide-react';
import { useToast } from '../components/toast/ToastProvider';
import AnimatedSpinner from '../components/AnimatedSpinner';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import { fadeUp } from '../utils/animations';
import { SUBJECT_META } from '../data/questionBank';
import {
  getCompetition,
  acceptCompetition,
  declineCompetition,
  startCompetition,
  cancelCompetition,
} from '../services/api';
import type { Competition, CompetitionParticipant, CompetitionStatus, CompetitionParticipantStatus } from '../types';

const SUBJECT_ICON_LABEL: Record<string, { label: string; icon: typeof Layers }> = {
  all: { label: 'Mixed Subjects', icon: Layers },
  ...Object.fromEntries(
    Object.entries(SUBJECT_META).map(([key, meta]) => [key, { label: meta.label, icon: meta.icon }])
  ),
};

const COMP_STATUS: Record<CompetitionStatus, { label: string; chip: string }> = {
  pending: { label: 'Waiting to start', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  live: { label: 'Live now', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  finished: { label: 'Finished', chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' },
  cancelled: { label: 'Cancelled', chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' },
};

const PLAYER_STATUS: Record<CompetitionParticipantStatus, { label: string; chip: string; dot: string }> = {
  invited: { label: 'Invited', chip: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', dot: 'bg-slate-400' },
  accepted: { label: 'Ready', chip: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400', dot: 'bg-blue-500' },
  playing: { label: 'Taking test', chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400', dot: 'bg-emerald-500' },
  finished: { label: 'Finished', chip: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400', dot: 'bg-indigo-500' },
  declined: { label: 'Declined', chip: 'bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400', dot: 'bg-rose-400' },
  abandoned: { label: 'Did not finish', chip: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', dot: 'bg-slate-400' },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function sortForLeaderboard(list: CompetitionParticipant[]): CompetitionParticipant[] {
  return [...list]
    .filter((p) => p.status === 'finished')
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.timeSpent !== b.timeSpent) return a.timeSpent - b.timeSpent;
      return new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
    });
}

export default function CompetitionDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(
    (silent = false) => {
      if (!silent) setLoading(true);
      getCompetition(id)
        .then((res) => setCompetition(res.competition))
        .catch(() => {
          if (!silent) setError('Unable to load this competition.');
        })
        .finally(() => setLoading(false));
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!competition || competition.status === 'finished' || competition.status === 'cancelled') return;
    const interval = window.setInterval(() => load(true), 8000);
    return () => window.clearInterval(interval);
  }, [competition?.status, load]);

  const mine = competition?.mine ?? null;

  const start = async () => {
    setBusy(true);
    try {
      await startCompetition(competition!.id);
      toast.success('Competition started', 'All ready players have been notified.');
      await load(true);
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || 'Could not start competition');
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (action: 'accept' | 'decline') => {
    setBusy(true);
    try {
      if (action === 'accept') {
        await acceptCompetition(competition!.id);
        toast.success('Invite accepted');
      } else {
        await declineCompetition(competition!.id);
        toast.success('Invite declined');
      }
      await load(true);
    } catch {
      toast.error('Could not update invite');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await cancelCompetition(competition!.id);
      toast.success('Competition cancelled');
      setCancelOpen(false);
      await load(true);
    } catch {
      toast.error('Could not cancel competition');
    } finally {
      setBusy(false);
    }
  };

  const activePlayers = useMemo(
    () =>
      (competition?.participants ?? []).filter(
        (p) => p.status !== 'invited' && p.status !== 'declined' && p.status !== 'abandoned'
      ),
    [competition]
  );
  const leaderboard = useMemo(() => sortForLeaderboard(competition?.participants ?? []), [competition]);

  if (loading || competition === null) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {error ? (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center dark:border-slate-800 dark:bg-slate-900">
            <p className="text-sm text-slate-600 dark:text-slate-300">{error}</p>
            <Link
              to="/competitions"
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to competitions
            </Link>
          </div>
        ) : (
          <AnimatedSpinner label="Loading competition..." />
        )}
      </div>
    );
  }

  const statusMeta = COMP_STATUS[competition.status];
  const subjectMeta = SUBJECT_ICON_LABEL[competition.subject] || SUBJECT_ICON_LABEL.all;
  const SubjectIcon = subjectMeta.icon;

  const myRow = mine ? leaderboard.findIndex((p) => p.userId === mine.userId) : -1;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        to="/competitions"
        className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Competitions
      </Link>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
            <SubjectIcon className="h-7 w-7 text-indigo-500" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{competition.title}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.chip}`}>
                {statusMeta.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Hosted by {competition.creatorName}
              {competition.classLevel ? ` · JHS ${competition.classLevel.slice(-1)}` : ''} · {subjectMeta.label}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" aria-hidden="true" /> {activePlayers.length}/{competition.maxParticipants} players
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" /> {competition.totalQuestions} questions
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {competition.timeMinutes} min each
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {competition.status === 'pending' && mine?.isCreator && (
              <>
                <button
                  type="button"
                  onClick={() => setCancelOpen(true)}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" aria-hidden="true" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={start}
                  disabled={activePlayers.length < 2 || busy}
                  className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlayCircle className="h-4 w-4" aria-hidden="true" />}
                  Start
                </button>
              </>
            )}
            {(competition.status === 'live') && mine && (mine.status === 'accepted' || mine.status === 'playing') && (
              <button
                type="button"
                onClick={() => navigate(`/competitions/${competition.id}/play`)}
                className="inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <PlayCircle className="h-5 w-5" aria-hidden="true" />
                {mine.status === 'playing' ? 'Resume test' : 'Take the test'}
              </button>
            )}
          </div>
        </div>

        {competition.status === 'live' && (
          <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
            Each player races their own timer. When every player finishes (or their time runs out), the leaderboard locks in.
          </div>
        )}
      </motion.div>

      {mine?.status === 'invited' && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="mt-4 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/10 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">You've been challenged!</p>
            <p className="mt-0.5 text-sm text-indigo-700 dark:text-indigo-300">
              {competition.creatorName} wants you to race {competition.totalQuestions} questions in {competition.timeMinutes} min.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleInvite('decline')}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 px-4 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
            >
              <Ban className="h-4 w-4" aria-hidden="true" /> Decline
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => handleInvite('accept')}
              className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
              Accept invite
            </button>
          </div>
        </motion.div>
      )}

      {competition.status === 'pending' && mine?.isCreator && activePlayers.length < 2 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          custom={1}
          className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <Users className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p>
            Set up is nearly done. This challenge cannot start until at least one classmate accepts your invite.
            {competition.status === 'pending' && ' Share the link with them or wait for them to accept.'}
          </p>
        </motion.div>
      )}

      {competition.status === 'finished' && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" /> Leaderboard
            </h2>
            {myRow >= 0 && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
                You placed #{myRow + 1}
              </span>
            )}
          </div>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {leaderboard.length > 0 ? (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((p, rank) => (
                  <li
                    key={p.id}
                    className={`flex items-center gap-4 px-5 py-4 ${
                      p.userId === mine?.userId ? 'bg-indigo-50/60 dark:bg-indigo-500/10' : ''
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {rank === 0 ? <Crown className="h-4 w-4 text-amber-500" aria-hidden="true" /> : rank + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {p.name}
                        {p.userId === competition.winnerId && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            <Medal className="h-3 w-3" aria-hidden="true" /> Winner
                          </span>
                        )}
                        {p.userId === mine?.userId && (
                          <span className="ml-2 text-xs font-medium text-indigo-500 dark:text-indigo-400">You</span>
                        )}
                      </p>
                      <p className="mt-0.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{p.correctAnswers}/{p.answeredQuestions} correct</span>
                        <span className="inline-flex items-center gap-1">
                          <Timer className="h-3 w-3" aria-hidden="true" /> {formatTime(p.timeSpent)}
                        </span>
                      </p>
                    </div>
                    <span className="shrink-0 text-lg font-bold text-slate-900 dark:text-white">{p.score}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">No players finished this competition.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <Users className="h-5 w-5 text-indigo-500" aria-hidden="true" /> Players
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {activePlayers.length}/{competition.maxParticipants}
          </span>
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(competition.participants ?? []).map((p) => {
            const meta = PLAYER_STATUS[p.status];
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {p.name}
                    {p.isCreator && <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />}
                  </p>
                  <p className="text-xs text-slate-400">
                    {p.status === 'finished' ? `${p.score}% · ${p.correctAnswers} correct` : meta.label}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chip}`}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel competition?"
        description={`“${competition.title}” will be cancelled and all players will be notified. This cannot be undone.`}
        confirmLabel="Cancel competition"
        tone="danger"
        loading={busy}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}