import { useEffect, useRef, useState } from 'react';
import { X, Printer } from 'lucide-react';
import ReportDocument from './ReportCard/ReportDocument';
import { pageWidthPx } from '../utils/reportCard';
import { useModalA11y } from '../hooks/useModalA11y';
import type { ReportData } from '../utils/reportCard';

interface ReportPreviewModalProps {
  open: boolean;
  onClose: () => void;
  data: ReportData;
  photoData?: string | null;
}

export default function ReportPreviewModal({ open, onClose, data, photoData }: ReportPreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const { dialogRef } = useModalA11y(open, { onClose });

  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      setScale(Math.min(1, width / pageWidthPx()));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  if (!open) return null;

  const handlePrint = () => window.print();

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Report preview"
      tabIndex={-1}
      className="fixed inset-0 z-[80] flex flex-col bg-slate-950/70 backdrop-blur-sm outline-none"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/95 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">Report Preview — {data.meta.reportNumber}</p>
          <p className="hidden text-xs text-slate-400 sm:block">
            {data.student.name} · {data.meta.academicYearLabel} · {data.meta.term}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            <Printer className="h-4 w-4" /> <span className="hidden sm:inline">Print / Save as PDF</span><span className="sm:hidden">Print</span>
          </button>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Scaled document */}
      <div ref={containerRef} className="report-preview-scroll flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="flex min-h-full justify-center">
          <div
            className="report-scale-wrap shrink-0"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: pageWidthPx() * scale }}
          >
            <div className="report-print-root">
              <ReportDocument data={data} photoData={photoData || null} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}