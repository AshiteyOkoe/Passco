import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Search, User, Eye, Download, Printer, RefreshCw,
  Trash2, Plus, AlertCircle,
} from 'lucide-react';
import AnimatedSpinner from '../components/AnimatedSpinner';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { useToast } from '../components/toast/ToastProvider';
import GenerateReportModal, { type ReportGeneratePayload } from '../components/GenerateReportModal';
import ReportPreviewModal from '../components/ReportPreviewModal';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import { fadeUp } from '../utils/animations';
import {
  getStudents,
  getReportSettings,
  getAdminReportCards,
  getAdminAssessmentResultsByUser,
  createAdminReportCard,
  adminRegenerateReportCard,
  deleteAdminReportCard,
} from '../services/api';
import { parseAssessments, restoreReportData } from '../utils/reportCard';
import type { ReportData, ReportAssessment } from '../utils/reportCard';
import type { ReportCardRecord, ReportSettings } from '../types';

interface PreviewState {
  data: ReportData;
  photoData: string | null;
  printAfterOpen?: boolean;
}

export default function AdminReports() {
  const toast = useToast();
  const [students, setStudents] = useState<Array<{ id: string; name: string; email: string; institution?: string; gradeLevel?: string; avatar?: string }>>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<(typeof students)[number] | null>(null);
  const [reports, setReports] = useState<ReportCardRecord[]>([]);
  const [assessments, setAssessments] = useState<ReportAssessment[]>([]);
  const [settings, setSettings] = useState<ReportSettings>({
    gradeConfig: [],
    thresholds: { pass: 50, improve: 60, strength: 75 },
    branding: { reportTitle: 'Academic Report Card', subtitle: '', schoolName: '', directorName: '', directorTitle: '', footerNote: '' },
  });
  const [loading, setLoading] = useState(true);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ReportCardRecord | null>(null);

  useEffect(() => {
    Promise.all([getStudents(), getReportSettings()])
      .then(([stuRes, setRes]) => {
        setStudents(stuRes.students);
        if (setRes.settings?.gradeConfig?.length) setSettings(setRes.settings);
      })
      .catch(() => setError('Unable to load students. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);

  const loadStudent = useCallback(async (id: string) => {
    const student = students.find((s) => s.id === id) || null;
    setSelectedId(id);
    setSelectedStudent(student);
    setGenerateOpen(false);
    setError('');
    if (!student) return;
    setLoadingStudent(true);
    try {
      const [repRes, asRes] = await Promise.all([
        getAdminReportCards(id),
        getAdminAssessmentResultsByUser(id),
      ]);
      const rows = Array.isArray(asRes.results) ? asRes.results : [];
      const parsed = parseAssessments(rows, []);
      const classLevel = rows.map((r) => String((r as Record<string, unknown>).class_level || '')).find(Boolean) || undefined;
      if (classLevel) setSelectedStudent((prev) => (prev ? { ...prev, gradeLevel: prev.gradeLevel || (classLevel as string) } : prev));
      setReports(repRes.reports || []);
      setAssessments(parsed);
    } catch {
      setReports([]);
      setAssessments([]);
      setError('Could not load this student’s reports and results.');
    } finally {
      setLoadingStudent(false);
    }
  }, [students]);

  const filtered = useMemo(
    () =>
      students.filter((s) =>
        [s.name, s.email, s.id].join(' ').toLowerCase().includes(search.toLowerCase())
      ),
    [students, search]
  );

  const visibleReports = reports.filter((r) => r.status !== 'void');
  const {
    page: reportPage,
    totalPages: reportTotalPages,
    pageItems: pagedReports,
    goTo: goToReportPage,
  } = usePagination(visibleReports, 6);

  const {
    page: studentPage,
    totalPages: studentTotalPages,
    pageItems: pagedStudents,
    goTo: goToStudentPage,
    reset: resetStudentPage,
  } = usePagination(filtered, 8);

  useEffect(() => {
    resetStudentPage();
  }, [search, resetStudentPage]);

  const replaceNumbers = (data: ReportData, record: ReportCardRecord): ReportData => ({
    ...data,
    meta: { ...data.meta, reportNumber: record.reportNumber, verificationCode: record.verificationCode },
  });

  const openReport = useCallback((rec: ReportCardRecord, printNow = false) => {
    const data = restoreReportData(rec.dataSnapshot);
    setPreview({
      data: { ...data, meta: { ...data.meta, reportNumber: rec.reportNumber, verificationCode: rec.verificationCode } },
      photoData: rec.profilePhotoSnapshotUrl || null,
      printAfterOpen: printNow,
    });
  }, []);

  useEffect(() => {
    if (!preview?.printAfterOpen) return;
    const t = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(t);
  }, [preview]);

  const store = async (fn: () => Promise<{ report: ReportCardRecord }>, label: string) => {
    setBusy(true);
    setError('');
    try {
      const { report } = await fn();
      setReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
      setGenerateOpen(false);
      toast.success(`${label} ${report.reportNumber}`);
      return report;
    } catch {
      setError(label === 'Regenerated' ? 'Could not regenerate the report.' : 'Could not generate the report.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async (payload: ReportGeneratePayload) => {
    if (!selectedStudent) return;
    const report = await store(
      () =>
        createAdminReportCard(selectedStudent!.id, {
          academicYear: String(payload.academicYear),
          term: payload.term,
          periodLabel: payload.data.meta.periodLabel,
          periodStart: payload.data.meta.periodStart,
          periodEnd: payload.data.meta.periodEnd,
          overallScore: payload.data.overall.score,
          overallGrade: payload.data.overall.grade,
          overallRemark: payload.data.overall.remark,
          dataSnapshot: payload.data as unknown as Record<string, unknown>,
          profilePhotoSnapshotUrl: payload.photoData || '',
        }),
      'Report generated:'
    );
    if (report) setPreview({ data: replaceNumbers(payload.data, report), photoData: payload.photoData, printAfterOpen: true });
  };

  const handleRegenerate = async (rec: ReportCardRecord) => {
    if (!selectedStudent) return;
    const report = await store(
      () =>
        adminRegenerateReportCard(selectedStudent!.id, {
          academicYear: rec.academicYear,
          term: rec.term,
          periodLabel: rec.periodLabel,
          periodStart: rec.periodStart || undefined,
          periodEnd: rec.periodEnd || undefined,
          overallScore: rec.overallScore,
          overallGrade: rec.overallGrade,
          overallRemark: rec.overallRemark,
          dataSnapshot: rec.dataSnapshot,
          profilePhotoSnapshotUrl: rec.profilePhotoSnapshotUrl || '',
        }),
      'Regenerated:'
    );
    if (report) openReport(report, true);
  };

  const handleDelete = async (rec: ReportCardRecord) => {
    try {
      await deleteAdminReportCard(rec.id);
      setReports((prev) => prev.filter((r) => r.id !== rec.id));
      toast.success(`Deleted ${rec.reportNumber}`);
    } catch {
      setError('Could not delete that report.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handlePreview = useCallback((payload: ReportGeneratePayload) => {
    setGenerateOpen(false);
    setPreview({ data: payload.data, photoData: payload.photoData });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-8">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Admin · Report Cards</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Generate, regenerate and manage official academic report cards for students
            </p>
          </div>
        </motion.div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Student search */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <User className="h-4 w-4 text-indigo-500" /> Select Student
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); }}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {loading ? (
            <div className="mt-3 flex items-center justify-center gap-2 py-6 text-sm text-slate-400"><AnimatedSpinner /> Loading students…</div>
          ) : filtered.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No students match your search.</p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {pagedStudents.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => loadStudent(s.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                      selectedId === s.id
                        ? 'bg-indigo-50 dark:bg-indigo-500/10'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                      {s.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800 dark:text-white">{s.name}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {s.email} · {s.gradeLevel || 'No class'}
                      </p>
                    </div>
                    {selectedId === s.id && <FileText className="h-4 w-4 shrink-0 text-indigo-500" />}
                  </button>
                </li>
              ))}
              </ul>
              <Pagination
                className="mt-3"
                page={studentPage}
                totalPages={studentTotalPages}
                totalItems={filtered.length}
                perPage={8}
                onPageChange={goToStudentPage}
              />
            </>
          )}
        </div>

        {/* Selected student panel */}
        {selectedId && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                  <User className="h-5 w-5 text-indigo-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedStudent?.name || 'Student'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {assessments.length} assessment{assessments.length === 1 ? '' : 's'} · {reports.filter((r) => r.status !== 'void').length} report{reports.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGenerateOpen(true)}
                disabled={assessments.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" /> Generate Report
              </button>
            </div>

            {loadingStudent ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400"><AnimatedSpinner /> Loading reports…</div>
            ) : reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                No reports for this student yet. Click <strong>"Generate Report"</strong> to create the first report card.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedReports.map((rec) => (
                  <div key={rec.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{rec.reportNumber}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {rec.academicYear} · {rec.term}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${rec.status === 'current' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                        {rec.status === 'current' ? 'Current' : 'Superseded'}
                      </span>
                    </div>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{rec.overallScore}%</span>
                      <div>
                        <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-sm font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">{rec.overallGrade}</span>
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                          {new Date(rec.generatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-4">
                        <button
                          onClick={() => openReport(rec)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          aria-label={`View report ${rec.reportNumber}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openReport(rec, true)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl bg-indigo-600 px-2 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                          aria-label={`Download report ${rec.reportNumber}`}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRegenerate(rec)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          aria-label={`Regenerate report ${rec.reportNumber}`}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(rec)}
                          className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 px-2 py-2.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                          aria-label={`Delete report ${rec.reportNumber}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => openReport(rec, true)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-2 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                      >
                        <Printer className="h-3.5 w-3.5" /> Print
                      </button>
                    </div>
                    </div>
                  ))}
                </div>
                <Pagination
                  className="mt-4"
                  page={reportPage}
                  totalPages={reportTotalPages}
                  totalItems={visibleReports.length}
                  perPage={6}
                  onPageChange={goToReportPage}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Generate modal */}
      {selectedStudent && (
        <GenerateReportModal
          open={generateOpen}
          onClose={() => setGenerateOpen(false)}
          student={{ id: selectedStudent.id, name: selectedStudent.name, institution: selectedStudent.institution, classLevel: selectedStudent.gradeLevel, gradeLevel: selectedStudent.gradeLevel, avatar: selectedStudent.avatar }}
          assessments={assessments}
          gradeConfig={settings.gradeConfig}
          thresholds={settings.thresholds}
          onPreview={handlePreview}
          onGenerate={handleGenerate}
          generating={busy}
        />
      )}

      {/* Preview modal */}
      <ReportPreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        data={preview?.data || ({} as ReportData)}
        photoData={preview?.photoData}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete report?"
        description={`Delete report ${deleteTarget?.reportNumber ?? ''}? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        loading={busy}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}