import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, CheckCircle2, XCircle, FileText, Award, RefreshCw, Search } from 'lucide-react';
import AnimatedSpinner from '../components/AnimatedSpinner';
import Pagination from '../components/Pagination';
import { usePagination } from '../hooks/usePagination';
import { useToast } from '../components/toast/ToastProvider';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import GenerateReportModal, { type ReportGeneratePayload } from '../components/GenerateReportModal';
import ReportPreviewModal from '../components/ReportPreviewModal';
import {
  getAdminDocumentRequests,
  approveDocumentRequest,
  rejectDocumentRequest,
  getReportSettings,
  getAdminAssessmentResultsByUser,
  getAdminReportCards,
} from '../services/api';
import { parseAssessments, restoreReportData } from '../utils/reportCard';
import type { ReportData } from '../utils/reportCard';
import type { ReportAssessment, ReportTerm } from '../utils/reportCard';
import type { DocumentRequestRecord, ReportCardRecord, ReportSettings } from '../types';

type Filter = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all';

interface PreviewState {
  data: ReportData;
  photoData: string | null;
  printAfterOpen?: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  rejected: 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  cancelled: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export default function AdminDocumentRequests() {
  const toast = useToast();
  const [requests, setRequests] = useState<DocumentRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<ReportSettings>({
    gradeConfig: [],
    thresholds: { pass: 50, improve: 60, strength: 75 },
    branding: { reportTitle: 'Academic Report Card', subtitle: '', schoolName: '', directorName: '', directorTitle: '', footerNote: '' },
  });

  const [approveReport, setApproveReport] = useState<DocumentRequestRecord | null>(null);
  const [certApproveTarget, setCertApproveTarget] = useState<DocumentRequestRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<DocumentRequestRecord | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const [assessments, setAssessments] = useState<ReportAssessment[]>([]);
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await getAdminDocumentRequests();
      setRequests(res.requests || []);
    } catch {
      toast.error('Could not load document requests.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    refresh();
    getReportSettings()
      .then((res) => {
        if (res.settings?.gradeConfig?.length) setSettings(res.settings);
      })
      .catch(() => {});
  }, [refresh]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = filter === 'all' || r.status === filter;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || [r.studentName, (r.userId || ''), r.academicYear, r.term, r.kind, r.reportNumber, r.certificateCode]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [requests, filter, search]);

  const {
    page,
    totalPages,
    pageItems,
    goTo,
    reset,
  } = usePagination(filtered, 8);

  useEffect(() => {
    reset();
  }, [filter, search, reset]);

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

  const startReportApproval = useCallback(async (request: DocumentRequestRecord) => {
    setApproveReport(request);
    setGenerateOpen(false);
    if (!request.userId) {
      toast.error('This request has no linked student.');
      return;
    }
    setLoadingStudent(true);
    try {
      const asRes = await getAdminAssessmentResultsByUser(request.userId);
      const rows = Array.isArray(asRes.results) ? asRes.results : [];
      setAssessments(parseAssessments(rows, []));
      setGenerateOpen(true);
    } catch {
      toast.error('Could not load this student’s results.');
    } finally {
      setLoadingStudent(false);
    }
  }, [toast]);

  const handlePreview = useCallback((payload: ReportGeneratePayload) => {
    setGenerateOpen(false);
    setPreview({ data: payload.data, photoData: payload.photoData });
  }, []);

  const handleApproveReport = useCallback(async (payload: ReportGeneratePayload) => {
    if (!approveReport?.userId) return;
    setApproving(true);
    try {
      const { request } = await approveDocumentRequest(approveReport.id, {
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
      setApproveReport(null);
      setGenerateOpen(false);
      toast.success(`Request approved — report issued.`);
      setRequests((prev) => prev.map((r) => (r.id === request.id ? request : r)));
      if (request.reportId) {
        try {
          const { reports } = await getAdminReportCards(approveReport.userId);
          const rec = reports.find((r) => r.id === request.reportId);
          if (rec) openReport(rec, true);
        } catch { /* preview is best-effort */ }
      }
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(data?.message || 'Could not approve this request.');
      if (data?.message) setApproveReport(null);
    } finally {
      setApproving(false);
    }
  }, [approveReport, openReport, toast]);

  const handleApproveCertificate = useCallback(async () => {
    if (!certApproveTarget) return;
    setApproving(true);
    try {
      const { request } = await approveDocumentRequest(certApproveTarget.id, {});
      setCertApproveTarget(null);
      toast.success(`Request approved — certificate code ${request.certificateCode || 'issued'}.`);
      setRequests((prev) => prev.map((r) => (r.id === request.id ? request : r)));
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(data?.message || 'Could not approve this request.');
      if (data?.message) setCertApproveTarget(null);
    } finally {
      setApproving(false);
    }
  }, [certApproveTarget, toast]);

  const handleReject = useCallback(async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const { request } = await rejectDocumentRequest(rejectTarget.id, rejectNote);
      setRejectTarget(null);
      setRejectNote('');
      toast.success('Request rejected.');
      setRequests((prev) => prev.map((r) => (r.id === request.id ? request : r)));
    } catch {
      toast.error('Could not reject the request.');
    } finally {
      setRejecting(false);
    }
  }, [rejectTarget, rejectNote, toast]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10">
              <ClipboardList className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Document Requests</h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Students request report cards and certificates — review and approve or reject them here.
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(['pending', 'approved', 'rejected', 'cancelled', 'all'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold capitalize transition ${
                  filter === f
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, year, code…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-72 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <AnimatedSpinner />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">No requests here</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {filter === 'pending' ? 'There are no pending requests to review yet.' : 'No requests match your current filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageItems.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
                        {r.kind === 'report'
                          ? <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                          : <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />}
                      </div>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                          <span className="capitalize">{r.studentName || 'Student'}</span>
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{r.kind}</span>
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {r.kind === 'report' ? `${r.academicYear} · ${r.term}` : 'A+ Excellence Certificate'} · {new Date(r.requestedAt).toLocaleString()}
                        </p>
                        {r.kind === 'report' && r.reportNumber && (
                          <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">{r.reportNumber}</p>
                        )}
                        {r.kind === 'certificate' && r.certificateCode && (
                          <p className="mt-1 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">{r.certificateCode}</p>
                        )}
                        {r.status === 'rejected' && r.adminNote && (
                          <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{r.adminNote}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLES[r.status] || ''}`}>
                        {r.status}
                      </span>
                      {r.status === 'pending' && (
                        <>
                          <button
                            onClick={() => (r.kind === 'report' ? startReportApproval(r) : setCertApproveTarget(r))}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => { setRejectTarget(r); setRejectNote(''); }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-500/10"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              perPage={8}
              onPageChange={goTo}
            />
          </>
        )}
      </div>

      {/* Report approve modal */}
      {approveReport?.userId && (
        <GenerateReportModal
          open={generateOpen}
          onClose={() => { setGenerateOpen(false); setApproveReport(null); }}
          student={{
            id: approveReport.userId,
            name: approveReport.studentName || 'Student',
            classLevel: approveReport.academicYear,
          }}
          assessments={loadingStudent ? [] : assessments}
          gradeConfig={settings.gradeConfig}
          thresholds={settings.thresholds}
          defaultYear={Number(approveReport.academicYear) || undefined}
          defaultTerm={(approveReport.term as ReportTerm) || 'Full Year'}
          onPreview={handlePreview}
          onGenerate={handleApproveReport}
          generating={approving}
        />
      )}

      {/* Certificate approve confirmation */}
      <ConfirmDialog
        open={!!certApproveTarget}
        title="Approve certificate request?"
        description={`Issue the A+ Excellence Certificate to ${certApproveTarget?.studentName || 'this student'}? A verification code will be generated automatically.`}
        confirmLabel="Approve"
        loading={approving}
        onConfirm={handleApproveCertificate}
        onCancel={() => setCertApproveTarget(null)}
      />

      {/* Reject confirmation */}
      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject request?"
        description="The student will see the reason below."
        confirmLabel="Reject"
        tone="danger"
        loading={rejecting}
        onConfirm={handleReject}
        onCancel={() => { setRejectTarget(null); setRejectNote(''); }}
      >
        <label htmlFor="reject-note" className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Reason (optional)
        </label>
        <textarea
          id="reject-note"
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          rows={3}
          placeholder="Explain why this request is being rejected…"
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </ConfirmDialog>

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