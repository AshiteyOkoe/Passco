import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getAllTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from '../services/api';
import { fadeUp, stagger } from '../utils/animations';
import { Quote, Star, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import AnimatedSpinner from '../components/AnimatedSpinner';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import type { Testimonial } from '../types';

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [school, setSchool] = useState('');
  const [quote, setQuote] = useState('');
  const [rating, setRating] = useState(5);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    getAllTestimonials()
      .then(({ testimonials: t }) => setTestimonials(t))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!name.trim() || !quote.trim()) return;
    setCreating(true);
    try {
      const res = await createTestimonial({ name: name.trim(), role, school, quote: quote.trim(), rating });
      setTestimonials([res.testimonial, ...testimonials]);
      setName(''); setRole(''); setSchool(''); setQuote(''); setRating(5); setShowForm(false);
    } catch { /* ignore */ } finally { setCreating(false); }
  };

  const handleToggleApproved = async (t: Testimonial) => {
    setUpdatingId(t.id);
    try {
      const res = await updateTestimonial(t.id, { isApproved: !t.is_approved });
      setTestimonials(testimonials.map((x) => (x.id === t.id ? res.testimonial : x)));
    } catch { /* ignore */ } finally { setUpdatingId(null); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTestimonial(id);
      setTestimonials(testimonials.filter((x) => x.id !== id));
    } catch { /* ignore */ }
  };

  const { page, totalPages, pageItems, goTo } = usePagination(testimonials, 12);

  if (loading) return <div className="flex items-center justify-center p-12"><AnimatedSpinner label="Loading..." /></div>;

  const approvedCount = testimonials.filter((t) => t.is_approved).length;

  return (
    <div className="p-4 sm:p-6">
      <motion.div className="mb-6 flex flex-wrap items-start justify-between gap-4" variants={fadeUp} initial="hidden" animate="visible">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Testimonials</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage student testimonials shown on the landing page. {approvedCount} of {testimonials.length} visible.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Testimonial
        </button>
      </motion.div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Student name *"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role (e.g. JHS 3 Student)"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="School"
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((r) => (
                <button key={r} type="button" onClick={() => setRating(r)} aria-label={`${r} star`}>
                  <Star className={`h-5 w-5 ${r <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                </button>
              ))}
            </div>
          </div>
          <textarea value={quote} onChange={(e) => setQuote(e.target.value)} placeholder="Testimonial quote *" rows={3}
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreate} disabled={creating || !name.trim() || !quote.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
              {creating ? 'Saving...' : 'Publish'}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {testimonials.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="rounded-2xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
          <Quote className="mx-auto mb-3 h-8 w-8 text-slate-300 dark:text-slate-700" />
          <p className="text-sm text-slate-500 dark:text-slate-400">No testimonials yet. Create one to showcase student feedback.</p>
        </motion.div>
      ) : (
        <>
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((t) => (
            <motion.div
              key={t.id}
              variants={fadeUp}
              className={`flex flex-col rounded-2xl border bg-white p-5 dark:bg-slate-900 ${
                t.is_approved ? 'border-slate-200 dark:border-slate-800' : 'border-dashed border-amber-400/60 dark:border-amber-500/40'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s < (t.rating || 5) ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'}`} />
                  ))}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  t.is_approved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                }`}>
                  {t.is_approved ? 'Visible' : 'Hidden'}
                </span>
              </div>
              <p className="flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">"{t.quote}"</p>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {[t.role, t.school].filter(Boolean).join(' · ') || 'Passco Student'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleApproved(t)}
                    disabled={updatingId === t.id}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 dark:hover:bg-slate-800"
                    aria-label={t.is_approved ? 'Hide testimonial' : 'Show testimonial'}
                  >
                    {t.is_approved ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800"
                    aria-label="Delete testimonial"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={testimonials.length}
          perPage={12}
          onPageChange={goTo}
          className="mt-6"
        />
        </>
      )}
    </div>
  );
}