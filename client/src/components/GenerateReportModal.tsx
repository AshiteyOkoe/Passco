import { useEffect, useMemo, useState } from 'react';
import { X, FileText, Eye, CheckSquare, Square, AlertCircle } from 'lucide-react';
import AnimatedSpinner from './AnimatedSpinner';
import { useModalA11y } from '../hooks/useModalA11y';
import type { ReportGradeRow, ReportThresholds } from '../types';
import {
  TERMS,
  type ReportTerm,
  type ReportOptions,
  type ReportData,
  DEFAULT_REPORT_OPTIONS,
  buildReportData,
  filterByPeriod,
  listAcademicYears,
  periodLabelFor,
  academicYearLabel,
  resolvePhotoDataUrl,
} from '../utils/reportCard';
import type { ReportAssessment } from '../utils/reportCard';

export interface ReportGeneratePayload {
  data: ReportData;
  photoData: string | null;
  academicYear: number;
  term: ReportTerm;
  options: ReportOptions;
  teacherRemark: string;
  teacherName: string;
  teacherTitle: string;
}

interface GenerateReportModalProps {
  open: boolean;
  onClose: () => void;
  student: { id: string; name: string; institution?: string; classLevel?: string; gradeLevel?: string; avatar?: string };
  assessments: ReportAssessment[];
  gradeConfig: ReportGradeRow[];
  thresholds: ReportThresholds;
  onPreview: (payload: ReportGeneratePayload) => void;
  onGenerate: (payload: ReportGeneratePayload) => void;
  generating?: boolean;
  defaultYear?: number;
  defaultTerm?: ReportTerm;
}

const SECTION_OPTIONS: Array<{ key: keyof ReportOptions; label: string; sub?: string; disabled?: boolean }> = [
  { key: 'subjectPerformance', label: 'Subject Performance' },
  { key: 'topicPerformance', label: 'Topic Performance', sub: 'Coming soon', disabled: true },
  { key: 'performanceTrend', label: 'Performance Trend' },
  { key: 'assessmentStatistics', label: 'Assessment Statistics' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'strengths', label: 'Strengths' },
  { key: 'improvements', label: 'Areas for Improvement' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'verificationQr', label: 'Verification QR Code' },
  { key: 'profilePhoto', label: 'Student Profile Photo' },
  { key: 'teacherRemark', label: "Teacher / Platform Remark" },
];

export default function GenerateReportModal({
  open,
  onClose,
  student,
  assessments,
  gradeConfig,
  thresholds,
  onPreview,
  onGenerate,
  generating = false,
  defaultYear,
  defaultTerm,
}: GenerateReportModalProps) {
  const years = useMemo(() => listAcademicYears(assessments), [assessments]);
  const [year, setYear] = useState<number>(defaultYear && years.includes(defaultYear) ? defaultYear : (years[0] || new Date().getFullYear()));
  const [term, setTerm] = useState<ReportTerm>(defaultTerm || 'Full Year');
  const [options, setOptions] = useState<ReportOptions>({ ...DEFAULT_REPORT_OPTIONS });
  const [teacherRemark, setTeacherRemark] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherTitle, setTeacherTitle] = useState('Teacher');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { dialogRef } = useModalA11y(open, { onClose });

  useEffect(() => {
    if (open) {
      setYear(defaultYear && years.includes(defaultYear) ? defaultYear : (years[0] || new Date().getFullYear()));
      setTerm(defaultTerm || 'Full Year');
      setOptions({ ...DEFAULT_REPORT_OPTIONS });
      setTeacherRemark('');
      setTeacherName('');
      setTeacherTitle('Teacher');
      setError('');
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const count = useMemo(() => filterByPeriod(assessments, year, term).length, [assessments, year, term]);

  const toggleOption = (key: keyof ReportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const build = async (): Promise<ReportGeneratePayload> => {
    const photoData = options.profilePhoto ? await resolvePhotoDataUrl(student.avatar) : null;
    const data = buildReportData({
      user: {
        id: student.id,
        name: student.name,
        institution: student.institution,
        classLevel: student.classLevel,
        gradeLevel: student.gradeLevel,
      },
      assessments,
      year,
      term,
      gradeConfig,
      thresholds,
      reportNumber: `PASSCO-RPT-${year}-000000`,
      verificationCode: 'PASSCO-VRF-PREVIEW',
      dateIssued: Date.now(),
      options,
      teacherRemark,
      teacherName,
      teacherTitle,
    });
    return { data, photoData, academicYear: year, term, options, teacherRemark, teacherName, teacherTitle };
  };

  const handlePreview = async () => {
    setError('');
    setBusy(true);
    try {
      const payload = await build();
      if (payload.data.summary.assessmentsTaken === 0) {
        setError('Your report could not be generated because there is not enough assessment data for the selected period.');
        setBusy(false);
        return;
      }
      setBusy(false);
      onPreview(payload);
    } catch {
      setError('Something went wrong while preparing your report. Please try again.');
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    setError('');
    setBusy(true);
    try {
      const payload = await build();
      if (payload.data.summary.assessmentsTaken === 0) {
        setError('Your report could not be generated because there is not enough assessment data for the selected period.');
        setBusy(false);
        return;
      }
      setBusy(false);
      onGenerate(payload);
    } catch {
      setError('Something went wrong while preparing your report. Please try again.');
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gen-report-title"
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-500/10">
              <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 id="gen-report-title" className="text-base font-bold text-slate-900 sm:text-lg dark:text-white">Download Academic Report</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select the period and sections to include</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {/* Period */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Report Period</p>
          <div className="mb-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="rep-year">
              Academic Year
            </label>
            {years.length === 0 ? (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
                No assessment results available yet - complete at least one assessment to generate a report.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYear(y)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      year === y
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {academicYearLabel(y)}
                  </button>
                ))}
              </div>
            )}

            <p className="mb-1.5 mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">Term / Reporting Period</p>
            <div className="flex flex-wrap gap-2">
              {TERMS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    term === t
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {t === 'Full Year' ? 'Full Year' : t}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {periodLabelFor(year, term)} · <strong className="text-slate-600 dark:text-slate-300">{count}</strong> assessment{count === 1 ? '' : 's'} in range
            </p>
          </div>

          {/* Sections */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Include in Report</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {SECTION_OPTIONS.map((opt) => {
              const checked = options[opt.key];
              const Icon = checked ? CheckSquare : Square;
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => toggleOption(opt.key)}
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    opt.disabled
                      ? 'cursor-not-allowed border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-600'
                      : checked
                        ? 'border-indigo-200 bg-indigo-50 text-slate-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{opt.label}</span>
                    {opt.sub && <span className="block text-[11px] text-slate-400 dark:text-slate-500">{opt.sub}</span>}
                  </span>
                  <Icon className={`h-4 w-4 shrink-0 ${opt.disabled ? 'text-slate-200 dark:text-slate-700' : checked ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`} />
                </button>
              );
            })}
          </div>

          {/* Teacher remark */}
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Teacher Remark (optional)</p>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <textarea
              value={teacherRemark}
              onChange={(e) => setTeacherRemark(e.target.value)}
              rows={3}
              placeholder="Add a remark for the report card (optional). If empty, a platform-generated remark is used."
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-indigo-500/20"
            />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="rep-tname">Teacher Name</label>
                <input
                  id="rep-tname"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. Mrs. Ama Owusu"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400" htmlFor="rep-ttitle">Role / Title</label>
                <input
                  id="rep-ttitle"
                  value={teacherTitle}
                  onChange={(e) => setTeacherTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
          {busy || generating ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">
              <AnimatedSpinner /> Preparing report…
            </div>
          ) : (
            <>
              <button
                onClick={handlePreview}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Eye className="h-4 w-4" /> Preview Report
              </button>
              <button
                onClick={handleGenerate}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <FileText className="h-4 w-4" /> Generate Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}