import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Users, Clock, ListChecks, Loader2, X, Swords, Search, Crown, Medal,
} from 'lucide-react';
import AnimatedSpinner from '../components/AnimatedSpinner';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { useModalA11y } from '../hooks/useModalA11y';
import { fadeUp } from '../utils/animations';
import { SUBJECT_META } from '../data/questionBank';
import { getAdminCompetitions, getAdminCompetition, getAdminCompetitionStats } from '../services/api';
import type { AdminCompetitionRow, Competition, CompetitionStatus } from '../types';

const STATUS_CHIP: Record<CompetitionStatus, { label: string; chip: string }> = {
  pending: { label: 'Pending', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  live: { label: 'Live', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  finished: { label: 'Finished', chip: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' },
  cancelled: { label: 'Cancelled', chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400' },
};

const SUBJECT_LABEL: Record<string, string> = {
  all: 'Mixed Subjects',
  ...Object.fromEntries(Object.entries(SUBJECT_META).map(([k, m]) => [k, m.label])),
};

function StatusPill({ status }: { status: CompetitionStatus }) {
  const meta = STATUS_CHIP[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chip}`}>
      {meta.label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminCompetitions() {
  const [rows, setRows] = useState<AdminCompetitionRow[]>([]);
  const [stats, setStats] = useState<{ total: number; byStatus: Record<CompetitionStatus, number>; participantCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | CompetitionStatus>('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([getAdminCompetitions(), getAdminCompetitionStats()])
      .then(([listRes, statsRes]) => {
        setRows(listRes.competitions);
        setStats(statsRes);
      })
      .catch(() => {
        /* keep existing rows */
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => (filter === 'all' ? true : r.status === filter))
      .filter(
        (r) =>
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.creatorName.toLowerCase().includes(q) ||
          (r.winnerName || '').toLowerCase().includes(q)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [rows, filter, search]);

  const { page, totalPages, pageItems, startIndex, endIndex, goTo, reset } = usePagination(filtered, 8);
  useEffect(() => {
    reset();
  }, [filter, search, reset]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <AnimatedSpinner label="Loading competitions..." />
      </div>
    );
  }

  const statCards = [
    { label: 'Total competitions', value: stats?.total ?? rows.length, icon: Swords, chip: 'text-indigo-500' },
    { label: 'Live now', value: stats?.byStatus.live ?? 0, icon: Trophy, chip: 'text-emerald-500' },
    { label: 'Pending', value: stats?.byStatus.pending ?? 0, icon: Clock, chip: 'text-amber-500' },
    { label: 'Players involved', value: stats?.participantCount ?? 0, icon: Users, chip: 'text-violet-500' },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
          <Swords className="h-4 w-4" aria-hidden="true" /> Student head-to-heads
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Competition Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Monitor quiz challenges between students, their status, and outcomes.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat, i) => (
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

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'pending', 'live', 'finished', 'cancelled'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-current={filter === key}
              className={`inline-flex h-10 shrink-0 items-center rounded-xl px-4 text-sm font-semibold transition ${
                filter === key
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {key === 'all' ? 'All' : STATUS_CHIP[key].label}
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, host, winner…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
            <Trophy className="h-7 w-7 text-indigo-500" aria-hidden="true" />
          </span>
          <p className="mt-4 text-base font-semibold text-slate-800 dark:text-white">No competitions found</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Students can create a challenge from their dashboard and invite up to 3 classmates.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3 font-semibold">Competition</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Players</th>
                  <th className="px-4 py-3 font-semibold">Winner</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageItems.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setDetailId(row.id)}
                    className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-white">{row.title}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        Hosted by {row.creatorName} · {SUBJECT_LABEL[row.subject] || row.subject}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-slate-900 dark:text-white">{row.participantCount}</span>
                      <span className="text-slate-400">/{row.maxParticipants}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                      {row.finishedCount > 0 ? (row.winnerName || '—') : '—'}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-400">{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 space-y-3 md:hidden">
            {pageItems.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setDetailId(row.id)}
                className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">{row.title}</p>
                  <StatusPill status={row.status} />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  By {row.creatorName} · {SUBJECT_LABEL[row.subject] || row.subject}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" /> {row.participantCount}/{row.maxParticipants} players
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ListChecks className="h-3.5 w-3.5" aria-hidden="true" /> {row.totalQuestions} questions
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {row.timeMinutes} min
                  </span>
                </div>
                {row.winnerName && row.finishedCount > 0 && (
                  <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">Winner: {row.winnerName}</p>
                )}
              </button>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            perPage={8}
            onPageChange={goTo}
            className="mt-5"
          />
        </>
      )}

      <CompetitionDetailModal id={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function CompetitionDetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const [data, setData] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(false);

  const { dialogRef } = useModalA11y(!!id, { onClose });

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }
    setLoading(true);
    getAdminCompetition(id)
      .then((res) => setData(res.competition))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (!id) return null;

  const ranked = (data?.participants ?? [])
    .filter((p) => p.status === 'finished')
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.timeSpent !== b.timeSpent) return a.timeSpent - b.timeSpent;
      return new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
    });

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-competition-title"
        className="animate-sheet-up max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white pt-5 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="admin-competition-title" className="truncate text-lg font-bold text-slate-900 dark:text-white">
              {data?.title ?? 'Competition details'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {data ? `Hosted by ${data.creatorName}` : ''} {data?.status ? `· ${STATUS_CHIP[data.status].label}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {loading && (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-500" aria-hidden="true" />
          </div>
        )}

        {!loading && data && (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: 'Questions', value: data.totalQuestions, icon: ListChecks },
                { label: 'Time / player', value: `${data.timeMinutes}m`, icon: Clock },
                { label: 'Players', value: `${data.participants.filter((p) => p.status !== 'invited' && p.status !== 'declined').length}/${data.maxParticipants}`, icon: Users },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-200 p-3 text-center dark:border-slate-700">
                  <stat.icon className="mx-auto h-4 w-4 text-slate-400" aria-hidden="true" />
                  <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  <p className="text-[11px] text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" /> Results
            </h3>
            <ul className="mt-2 space-y-2">
              {ranked.length === 0 && (
                <li className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400 dark:border-slate-700">
                  No players have finished yet.
                </li>
              )}
              {ranked.map((p, rank) => {
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      p.userId === data.winnerId
                        ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {rank === 0 ? <Crown className="h-4 w-4 text-amber-500" aria-hidden="true" /> : rank + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {p.name}
                        {p.userId === data.winnerId && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            <Medal className="h-3 w-3" aria-hidden="true" /> Winner
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.correctAnswers}/{p.answeredQuestions} correct · submitted {p.answers?.length ?? 0} answers
                      </p>
                    </div>
                    <span className="shrink-0 text-base font-bold text-slate-900 dark:text-white">{p.score}%</span>
                  </li>
                );
              })}
            </ul>

            {data.status === 'live' && (
              <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                This competition is live — results update as players finish.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}