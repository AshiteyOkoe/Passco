import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Flag, Search, ChevronLeft, ChevronRight, Loader2, Paperclip, Expand } from 'lucide-react';
import { cn } from '../utils';
import { fadeUp, slideUp } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import {
  getAdminContactMessages,
  updateContactMessageStatus,
  getAdminQuestionReports,
  updateQuestionReportStatus,
} from '../services/api';
import type { ContactMessage, QuestionReport } from '../types';

type Tab = 'messages' | 'reports';

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold capitalize', STATUS_STYLES[status] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400')}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function AdminContactMessages() {
  const [tab, setTab] = useState<Tab>('messages');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<{ name: string; data: string; from: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'messages') {
        const res = await getAdminContactMessages({
          status: statusFilter || undefined,
          search: search || undefined,
          page,
          limit: 20,
        });
        setMessages(res.messages);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      } else {
        const res = await getAdminQuestionReports({
          status: statusFilter || undefined,
          page,
          limit: 20,
        });
        setReports(res.reports);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      }
    } catch (error) {
      console.error('Failed to fetch support items', error);
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  function switchTab(next: Tab) {
    setTab(next);
    setPage(1);
    setStatusFilter('');
    setSearch('');
  }

  async function setStatus(type: Tab, id: string, status: string) {
    setBusyId(id);
    try {
      if (type === 'messages') {
        await updateContactMessageStatus(id, status);
      } else {
        await updateQuestionReportStatus(id, status);
      }
      await load();
    } catch (error) {
      console.error('Failed to update status', error);
    } finally {
      setBusyId(null);
    }
  }

  const isPdf = (data: string) => data.startsWith('data:application/pdf');
  const isImage = (data: string) => data.startsWith('data:image/');

  return (
    <div className="p-4 sm:p-6">
      <motion.div className="mb-6" variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Support & Reports</h1>
          {tab === 'messages' ? <MessageSquare className="h-6 w-6 text-indigo-500" /> : <Flag className="h-6 w-6 text-indigo-500" />}
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Incoming contact messages and in-examination question reports. {total} {tab === 'messages' ? 'message(s)' : 'report(s)'}.
        </p>
      </motion.div>

      <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => switchTab('messages')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
              tab === 'messages'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <MessageSquare className="h-4 w-4" /> Messages
          </button>
          <button
            onClick={() => switchTab('reports')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
              tab === 'reports'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            )}
          >
            <Flag className="h-4 w-4" /> Question Reports
          </button>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={tab === 'messages' ? 'Search name, email, subject...' : 'Search not available'}
              disabled={tab === 'reports'}
              className={cn(
                'w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-64',
                tab === 'reports' && 'opacity-40'
              )}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white sm:w-auto"
          >
            <option value="">All Status</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <AnimatedSpinner label="Loading..." />
        </div>
      ) : tab === 'messages' && messages.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-10 w-10" />} label="No contact messages yet." />
      ) : tab === 'reports' && reports.length === 0 ? (
        <EmptyState icon={<Flag className="h-10 w-10" />} label="No question reports yet." />
      ) : (
        <motion.div
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {tab === 'messages'
              ? messages.map((m) => (
                  <div key={m.id} className="p-4 sm:p-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900 dark:text-white">{m.name}</p>
                          <span className="text-xs text-slate-400">{m.email}</span>
                          <StatusPill status={m.status} />
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{m.subject}</p>
                        <p className="mt-1 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{m.message}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
                          {m.account_type && <span>Account: {m.account_type}</span>}
                          <span>{new Date(m.created_at).toLocaleString()}</span>
                          {m.attachment && (
                            <button
                              onClick={() => setPreview({ name: m.attachment_name || 'attachment', data: m.attachment || '', from: m.name })}
                              className="inline-flex items-center gap-1 font-medium text-indigo-500 hover:underline"
                            >
                              <Paperclip className="h-3 w-3" /> View attachment
                            </button>
                          )}
                        </div>
                      </div>
                      <StatusControls busyId={busyId} id={m.id} status={m.status} onSet={(s) => setStatus('messages', m.id, s)} />
                    </div>
                  </div>
                ))
              : reports.map((r) => (
                  <div key={r.id} className="p-4 sm:p-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold capitalize text-indigo-600 dark:text-indigo-400">{r.reason.replaceAll('_', ' ')}</p>
                          <StatusPill status={r.status} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{r.question_text || 'No question text captured'}</p>
                        {r.note && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Note: {r.note}</p>}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
                          {r.question_id && <span className="font-mono">QID: {r.question_id}</span>}
                          {r.subject && <span>Subject: {r.subject}</span>}
                          {r.class_level && <span>Class: {r.class_level}</span>}
                          {r.assessment_type && <span>Assessment: {r.assessment_type}</span>}
                          <span>By: {r.userName || 'Guest'}</span>
                          <span>{new Date(r.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <StatusControls busyId={busyId} id={r.id} status={r.status} onSet={(s) => setStatus('reports', r.id, s)} />
                    </div>
                  </div>
                ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-200 p-1.5 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border border-slate-200 p-1.5 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 dark:bg-slate-900 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Expand className="h-5 w-5 shrink-0 text-indigo-500" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900 dark:text-white">{preview.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Attachment from {preview.from}</p>
                </div>
              </div>
              <button onClick={() => setPreview(null)} className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200">
                Close
              </button>
            </div>
            {isPdf(preview.data) ? (
              <iframe title={preview.name} src={preview.data} className="h-[45vh] w-full rounded-xl border border-slate-200 dark:border-slate-700 sm:h-[60vh]" />
            ) : isImage(preview.data) ? (
              <img src={preview.data} alt={preview.name} className="max-h-[60vh] w-full rounded-xl object-contain" />
            ) : (
              <iframe title={preview.name} src={preview.data} className="h-[45vh] w-full rounded-xl border border-slate-200 dark:border-slate-700 sm:h-[60vh]" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusControls({
  id,
  status,
  busyId,
  onSet,
}: {
  id: string;
  status: string;
  busyId: string | null;
  onSet: (status: string) => void;
}) {
  const options = ['new', 'in_progress', 'closed'];
  return (
    <div className="flex w-full shrink-0 items-center justify-between gap-2 lg:w-auto lg:justify-end">
      {busyId === id && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
      <label className="text-xs font-medium text-slate-400 sr-only">Status</label>
      <select
        value={status}
        onChange={(e) => onSet(e.target.value)}
        disabled={busyId === id}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white lg:w-auto"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o.replace('_', ' ')}</option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-slate-300 dark:text-slate-600">
      {icon}
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}