import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, Filter, ChevronLeft, ChevronRight, Loader2, XCircle } from 'lucide-react';
import { cn } from '../utils';
import { fadeUp, slideUp } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
  userName: string;
  userEmail: string;
}

const ACTION_LABELS: Record<string, string> = {
  delete_student: 'Deleted Student',
  approve_question: 'Approved Question',
  suspend_user: 'Suspended User',
  payment_verified: 'Payment Verified',
  login: 'User Login',
  register: 'User Registered',
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'User',
  question: 'Question',
  subscription: 'Subscription',
  payment: 'Payment',
};

const ACTION_COLORS: Record<string, string> = {
  delete_student: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  approve_question: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  suspend_user: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  payment_verified: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  login: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  register: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);

      const token = localStorage.getItem('passco-token');
      const res = await fetch(`/api/audit?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      let filtered = data.logs || [];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (l: AuditLog) =>
            l.userName?.toLowerCase().includes(q) ||
            l.userEmail?.toLowerCase().includes(q) ||
            l.action?.toLowerCase().includes(q) ||
            l.entity_type?.toLowerCase().includes(q)
        );
      }

      setLogs(filtered);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch {
      console.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }

  const uniqueActions = [...new Set(logs.map((l) => l.action))];
  const uniqueEntities = [...new Set(logs.map((l) => l.entity_type))];

  return (
    <div className="p-4 sm:p-6">
      <motion.div className="mb-6" variants={fadeUp} initial="hidden" animate="visible">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
          <Shield className="w-6 h-6 text-indigo-500" />
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Track all admin actions and system events. {total} total entries.
        </p>
      </motion.div>

      <motion.div
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-6"
        variants={slideUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none ring-indigo-500/20 transition focus:border-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>
              ))}
            </select>
            <select
              value={entityFilter}
              onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Entities</option>
              {uniqueEntities.map((e) => (
                <option key={e} value={e}>{ENTITY_LABELS[e] || e}</option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <AnimatedSpinner label="Loading audit logs..." />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center py-16">
          <XCircle className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No audit logs found.</p>
        </div>
      ) : (
        <motion.div
          className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Details</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={cn('inline-block px-2.5 py-1 rounded-lg text-xs font-semibold', ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400')}>
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{log.userName}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{log.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{ENTITY_LABELS[log.entity_type] || log.entity_type}</span>
                      {log.entity_id && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate max-w-[120px]">{log.entity_id}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.details && Object.keys(log.details).length > 0 ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {Object.entries(log.details).map(([k, v]) => `${k}: ${String(v)}`).join(', ')}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-4 py-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
