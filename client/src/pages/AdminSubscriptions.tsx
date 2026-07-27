import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAllPayments, getAllSubscriptions, getAllAnnouncements, createAnnouncement, deleteAnnouncement } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { fadeUp, stagger } from '../utils/animations';
import { CreditCard, Users, Megaphone, Trash2, Plus, DollarSign, TrendingUp } from 'lucide-react';
import AnimatedSpinner from '../components/AnimatedSpinner';
import type { Payment, Subscription, Announcement } from '../types';

export default function AdminSubscriptions() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'payments' | 'subscriptions' | 'announcements'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<(Subscription & { userName: string; userEmail: string })[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState('normal');
  const [annTarget, setAnnTarget] = useState('all');
  const [creatingAnn, setCreatingAnn] = useState(false);

  useEffect(() => {
    Promise.all([getAllPayments(), getAllSubscriptions(), getAllAnnouncements()])
      .then(([p, s, a]) => {
        setPayments(p.payments);
        setTotalRevenue(p.totalRevenue);
        setSubscriptions(s.subscriptions);
        setAnnouncements(a.announcements);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreateAnnouncement = async () => {
    if (!annTitle.trim() || !annBody.trim()) return;
    setCreatingAnn(true);
    try {
      const res = await createAnnouncement({ title: annTitle, body: annBody, priority: annPriority, targetAudience: annTarget });
      setAnnouncements([res.announcement, ...announcements]);
      setAnnTitle(''); setAnnBody(''); setShowAnnouncementForm(false);
    } catch { /* ignore */ } finally { setCreatingAnn(false); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      setAnnouncements(announcements.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><AnimatedSpinner label="Loading..." /></div>;

  const successPayments = payments.filter((p) => p.status === 'success');
  const activeSubs = subscriptions.filter((s) => s.status === 'active');

  return (
    <div className="p-4 sm:p-6">
      <motion.div className="mb-6" variants={fadeUp} initial="hidden" animate="visible">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscriptions & Payments</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage subscriptions, payments, and announcements.</p>
      </motion.div>

      <motion.div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" variants={stagger} initial="hidden" animate="visible">
        {[
          { icon: DollarSign, value: `GH₵ ${totalRevenue.toFixed(2)}`, label: 'Total Revenue', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { icon: CreditCard, value: successPayments.length, label: 'Successful Payments', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { icon: Users, value: activeSubs.length, label: 'Active Subscribers', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { icon: Megaphone, value: announcements.length, label: 'Announcements', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        ].map((s) => (
          <motion.div key={s.label} variants={fadeUp} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${s.bg}`}><s.icon className={`h-4 w-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</p>
            <p className="text-[10px] text-slate-500">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {(['payments', 'subscriptions', 'announcements'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'payments' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-white">{p.userName}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{p.plan}</span></td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300">GH₵ {p.amount}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : p.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                  }`}>{p.status}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No payments yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'subscriptions' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Expires</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {subscriptions.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-white">{s.userName}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">{s.plan}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    s.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>{s.status}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '-'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(s.starts_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No subscriptions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'announcements' && (
        <div>
          <div className="mb-4 flex justify-end">
            <button onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> New Announcement
            </button>
          </div>

          {showAnnouncementForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <input value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} placeholder="Title"
                className="mb-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
              <textarea value={annBody} onChange={(e) => setAnnBody(e.target.value)} placeholder="Announcement content..." rows={3}
                className="mb-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
              <div className="mb-3 flex gap-3">
                <select value={annPriority} onChange={(e) => setAnnPriority(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                  <option value="low">Low Priority</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select value={annTarget} onChange={(e) => setAnnTarget(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                  <option value="all">All Users</option>
                  <option value="students">Students Only</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateAnnouncement} disabled={creatingAnn || !annTitle.trim() || !annBody.trim()}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {creatingAnn ? 'Creating...' : 'Publish'}
                </button>
                <button onClick={() => setShowAnnouncementForm(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">{a.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      a.priority === 'urgent' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                        : a.priority === 'high' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>{a.priority}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{a.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{new Date(a.created_at).toLocaleDateString()} · {a.target_audience}</p>
                </div>
                <button onClick={() => handleDeleteAnnouncement(a.id)} className="shrink-0 p-2 text-slate-400 hover:text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {announcements.length === 0 && (
              <div className="py-12 text-center text-sm text-slate-400">
                <Megaphone className="mx-auto mb-3 h-8 w-8" /> No announcements yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
