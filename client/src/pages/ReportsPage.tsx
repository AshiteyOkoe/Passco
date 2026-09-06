import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Printer, Eye, AlertCircle, ArrowLeft, ShieldCheck, Download, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import AnimatedSpinner from '../components/AnimatedSpinner';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { useToast } from '../components/toast/ToastProvider';
import GenerateReportModal, { type ReportGeneratePayload } from '../components/GenerateReportModal';
import ReportPreviewModal from '../components/ReportPreviewModal';
import { useAuth } from '../context/AuthContext';
import { fadeUp } from '../utils/animations';
import {
  getMyReportCards,
  getReportSettings,
  getMyAssessmentResults,
  createReportCard,
  getReportCard,
} from '../services/api';
import { parseAssessments, restoreReportData } from '../utils/reportCard';
import type { ReportData } from '../utils/reportCard';
import type { ReportCardRecord, ReportSettings } from '../types';

interface PreviewState {
  data: ReportData;
  photoData: string | null;
  printAfterOpen?: boolean;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [reports, setReports] = useState<ReportCardRecord[]>([]);
  const [settings, setSettings] = useState<ReportSettings>({
    gradeConfig: [],
    thresholds: { pass: 50, improve: 60, strength: 75 },
    branding: { reportTitle: 'Academic Report Card', subtitle: '', schoolName: '', directorName: '', directorTitle: '', footerNote: '' },
  });
  const [assessments, setAssessments] = useState<ReturnType<typeof parseAssessments>>([]);
  const [loading, setLoading] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getMyReportCards(), getReportSettings(), getMyAssessmentResults()])
      .then(([repRes, setRes, asRes]) => {
        if (!mounted) return;
        const server = Array.isArray(asRes.results) ? asRes.results : [];
        let local: unknown[] = [];
        try {
          const raw = localStorage.getItem('assessment-history');
          if (raw) local = JSON.parse(raw) as unknown[];
        } catch { local = []; }
        setReports(repRes.reports || []);
        setSettings({
          gradeConfig: setRes.settings?.gradeConfig || [],
          thresholds: setRes.settings?.thresholds || { pass: 50, improve: 60, strength: 75 },
          branding: {
            reportTitle: 'Academic Report Card',
            subtitle: '',
            schoolName: '',
            directorName: '',
            directorTitle: '',
            footerNote: '',
          },
        });
        setAssessments(parseAssessments(server, local));
      })
      .catch(() => {
        if (mounted) setError('Unable to load your reports. Please try again shortly.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const openGenerate = useCallback(() => {
    setError('');
    setGenerateOpen(true);
  }, []);

  const handlePreview = useCallback((payload: ReportGeneratePayload) => {
    setGenerateOpen(false);
    setPreview({ data: payload.data, photoData: payload.photoData });
  }, []);

  const replaceNumbers = (data: ReportData, record: ReportCardRecord): ReportData => ({
    ...data,
    meta: { ...data.meta, reportNumber: record.reportNumber, verificationCode: record.verificationCode },
  });

  const handleGenerate = useCallback(async (payload: ReportGeneratePayload) => {
    setBusy(true);
    setError('');
    try {
      const res = await createReportCard({
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
      });
      const report = res.report;
      setReports((prev) => [report, ...prev.filter((r) => r.id !== report.id)]);
      setGenerateOpen(false);
      toast.success(`Report ${report.reportNumber} generated successfully.`);
      setPreview({ data: replaceNumbers(payload.data, report), photoData: payload.photoData, printAfterOpen: true });
    } catch {
      setError('Your report could not be generated. Please try again.');
    } finally {
      setBusy(false);
    }
  }, []);

  const openReport = useCallback(async (id: string, printNow = false) => {
    try {
      const { report } = await getReportCard(id);
      const data = restoreReportData(report.dataSnapshot);
      setPreview({
        data: { ...data, meta: { ...data.meta, reportNumber: report.reportNumber, verificationCode: report.verificationCode } },
        photoData: report.profilePhotoSnapshotUrl || null,
        printAfterOpen: printNow,
      });
    } catch {
      setError('Could not open that report. It may have been removed.');
    }
  }, []);

  useEffect(() => {
    if (!preview?.printAfterOpen) return;
    const t = window.setTimeout(() => window.print(), 600);
    return () => window.clearTimeout(t);
  }, [preview]);

  const yearOptions = Array.from(new Set(reports.map((r) => r.academicYear))).sort((a, b) => Number(b) - Number(a));

  const visibleReports = reports.filter((r) => r.status !== 'void');
  const {
    page: reportPage,
    totalPages: reportTotalPages,
    pageItems: reportCards,
    goTo: goToReportPage,
  } = usePagination(visibleReports, 6);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <AnimatedSpinner />
      </div>
    );
  }

  const hasNoData = assessments.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/results-dashboard"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Results Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Academic Report Cards</h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Generate, print and share official PASSCO performance report cards
            </p>
          </div>
          <div className="flex w-full justify-start sm:w-auto sm:justify-end">
            <button
              onClick={openGenerate}
              disabled={hasNoData}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Download Academic Report
            </button>
          </div>
        </motion.div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {hasNoData ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
              <FileText className="h-7 w-7 text-indigo-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">No report data yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Your report card is generated from your assessment results. Complete at least one assessment and it will appear here.
            </p>
            <Link
              to="/assessment/setup"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Take an Assessment
            </Link>
          </div>
        ) : (
          <>
            {/* Info strip */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-500" /> {assessments.length} assessment{assessments.length === 1 ? '' : 's'} available</span>
                {yearOptions.length > 0 && <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-500" /> Reports: {reports.length}</span>}
                <span className="hidden items-center gap-2 sm:flex"><Printer className="h-4 w-4 text-indigo-500" /> Print-ready A4 · QR verified</span>
              </div>
            </div>

            {/* My Reports */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
                  <FileText className="h-5 w-5 text-indigo-500" /> My Reports
                </h2>
              </div>

              {reportCards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No reports generated yet. Click <strong>"Download Academic Report"</strong> to create your first report card.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {reportCards.map((rec) => (
                      <div
                        key={rec.id}
                        className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900 dark:text-white">{rec.reportNumber}</p>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {rec.academicYear} · {rec.term}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                              rec.status === 'current'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                          >
                            {rec.status === 'current' ? 'Current' : 'Superseded'}
                          </span>
                        </div>
                        <div className="mb-4 flex items-center gap-3">
                          <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{rec.overallScore}%</span>
                          <div>
                            <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-sm font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                              {rec.overallGrade}
                            </span>
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                              {new Date(rec.generatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="mt-auto grid grid-cols-3 gap-2">
                          <button
                            onClick={() => openReport(rec.id)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          <button
                            onClick={() => openReport(rec.id, true)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-2 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </button>
                          <button
                            onClick={() => openReport(rec.id, true)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
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

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                <span>Want to see how reports compare to your results?</span>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-indigo-500" />
                  <span>Each report carries a unique verification code.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Generate modal */}
      {user && (
        <GenerateReportModal
          open={generateOpen}
          onClose={() => setGenerateOpen(false)}
          student={{
            id: user.id,
            name: user.name,
            institution: user.institution,
            classLevel: user.classLevel || user.gradeLevel,
            avatar: user.avatar,
          }}
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
    </div>
  );
}