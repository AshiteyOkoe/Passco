import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Plus, Trash2, AlertCircle, ShieldCheck, Settings2 } from 'lucide-react';
import AnimatedSpinner from '../components/AnimatedSpinner';
import { fadeUp } from '../utils/animations';
import { getReportSettings, updateReportSettings } from '../services/api';
import type { ReportBranding, ReportGradeRow, ReportSettings } from '../types';

const EMPTY_SETTINGS: ReportSettings = {
  gradeConfig: [
    { grade: 'A+', min: 90, max: 100, remark: 'Excellent' },
    { grade: 'A', min: 80, max: 89, remark: 'Very Good' },
    { grade: 'B', min: 70, max: 79, remark: 'Good' },
    { grade: 'C', min: 60, max: 69, remark: 'Satisfactory' },
    { grade: 'D', min: 50, max: 59, remark: 'Needs Improvement' },
    { grade: 'F', min: 0, max: 49, remark: 'Unsatisfactory' },
  ],
  thresholds: { pass: 50, improve: 60, strength: 75 },
  branding: {
    reportTitle: 'Academic Report Card',
    subtitle: 'Performance Report',
    schoolName: 'PASSCO',
    directorName: '',
    directorTitle: 'Head of Academics',
    footerNote: 'This report is system-generated and verified by PASSCO.',
  },
};

export default function AdminReportSettings() {
  const [settings, setSettings] = useState<ReportSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    getReportSettings()
      .then((res) => {
        const s = res.settings;
        if (s) {
          setSettings({
            gradeConfig: s.gradeConfig?.length ? s.gradeConfig : EMPTY_SETTINGS.gradeConfig,
            thresholds: { ...EMPTY_SETTINGS.thresholds, ...s.thresholds },
            branding: { ...EMPTY_SETTINGS.branding, ...s.branding },
          });
        }
      })
      .catch(() => setError('Could not load report settings.'))
      .finally(() => setLoading(false));
  }, []);

  const updateRow = (index: number, patch: Partial<ReportGradeRow>) => {
    setSettings((prev) => ({
      ...prev,
      gradeConfig: prev.gradeConfig.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    }));
  };

  const addRow = () => {
    setSettings((prev) => ({
      ...prev,
      gradeConfig: [...prev.gradeConfig, { grade: 'New Grade', min: 0, max: 0, remark: '' }],
    }));
  };

  const removeRow = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      gradeConfig: prev.gradeConfig.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setError('');
    const invalid = settings.gradeConfig.some((r) => !r.grade.trim() || Number.isNaN(Number(r.min)) || Number.isNaN(Number(r.max)));
    if (invalid) {
      setError('Every grade row needs a grade letter and numeric min/max values.');
      return;
    }
    setSaving(true);
    try {
      await updateReportSettings(settings);
      setNotice('Report settings saved successfully.');
      window.setTimeout(() => setNotice(''), 6000);
    } catch {
      setError('Could not save report settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <AnimatedSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-8">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Report Settings</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Grading scale, thresholds and branding used on every report card
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? <AnimatedSpinner /> : <Save className="h-4 w-4" />} Save Settings
          </button>
        </motion.div>

        {(error || notice) && (
          <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${notice ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
            {notice ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            {notice || error}
          </div>
        )}

        {/* Grading scale */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                <Settings2 className="h-5 w-5 text-indigo-500" /> Grading Scale
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Used to convert percentage scores into grades on report cards.
              </p>
            </div>
            <button
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" /> Add Grade
            </button>
          </div>

          <div className="space-y-2">
            <div className="hidden grid-cols-12 gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:grid">
              <span className="col-span-3">Grade</span>
              <span className="col-span-2">Min %</span>
              <span className="col-span-2">Max %</span>
              <span className="col-span-4">Remark</span>
              <span className="col-span-1" />
            </div>
            {settings.gradeConfig.map((row, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-12 sm:items-center dark:border-slate-800 dark:bg-slate-800/40">
                <input
                  value={row.grade}
                  onChange={(e) => updateRow(i, { grade: e.target.value })}
                  className="col-span-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-400 sm:col-span-3 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="A+"
                />
                <input
                  type="number"
                  value={row.min}
                  onChange={(e) => updateRow(i, { min: Number(e.target.value) })}
                  className="col-span-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 sm:col-span-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  value={row.max}
                  onChange={(e) => updateRow(i, { max: Number(e.target.value) })}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 sm:col-span-2 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <input
                  value={row.remark}
                  onChange={(e) => updateRow(i, { remark: e.target.value })}
                  className="col-span-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-indigo-400 sm:col-span-4 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  placeholder="Remark"
                />
                <button
                  onClick={() => removeRow(i)}
                  className="col-span-2 flex h-9 w-full items-center justify-center rounded-lg border border-rose-200 text-rose-500 transition hover:bg-rose-50 sm:col-span-1 dark:border-rose-500/30 dark:hover:bg-rose-500/10"
                  aria-label="Remove grade"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Thresholds */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Result Thresholds</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Controls PASS/REVIEW status and how strengths and improvement areas are classified.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(
              [
                { key: 'pass', label: 'Pass Mark (%)', desc: 'Overall scores below this are marked REVIEW REQUIRED' },
                { key: 'improve', label: 'Improvement Threshold (%)', desc: 'Subjects below this appear under Areas for Improvement' },
                { key: 'strength', label: 'Strength Threshold (%)', desc: 'Subjects at or above this are listed as Strengths' },
              ] as const
            ).map((t) => (
              <div key={t.key}>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{t.label}</label>
                <input
                  type="number"
                  value={settings.thresholds[t.key]}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      thresholds: { ...prev.thresholds, [t.key]: Number(e.target.value) },
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Branding */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-1 text-lg font-bold text-slate-900 dark:text-white">Report Branding</h2>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Shown on the masthead and footer of every report.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                { key: 'reportTitle', label: 'Report Title', placeholder: 'Academic Report Card' },
                { key: 'subtitle', label: 'Subtitle', placeholder: 'Performance Report' },
                { key: 'schoolName', label: 'School / Institution Name', placeholder: 'PASSCO' },
                { key: 'directorName', label: 'Director / Head Name', placeholder: 'Head of Academics' },
                { key: 'directorTitle', label: 'Director Role', placeholder: 'Head of Academics' },
              ] as const
            ).map((f) => (
              <div key={f.key}>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{f.label}</label>
                <input
                  value={settings.branding[f.key]}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      branding: { ...prev.branding, [f.key]: e.target.value },
                    }))
                  }
                  placeholder={f.placeholder}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Footer Note</label>
              <textarea
                value={settings.branding.footerNote}
                onChange={(e) => setSettings((prev) => ({ ...prev, branding: { ...prev.branding, footerNote: e.target.value } }))}
                rows={2}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? <AnimatedSpinner /> : <Save className="h-4 w-4" />} Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}