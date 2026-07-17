import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, RotateCcw, Check } from 'lucide-react';
import { cn } from '../utils';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (file: File) => void;
  onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCrop, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [offsetStart, setOffsetStart] = useState({ x: 0, y: 0 });

  const CROP_SIZE = 280;

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setOffset({ x: 0, y: 0 });
      setZoom(1);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;

    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);

    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW: number, drawH: number;
    if (imgAspect > 1) {
      drawH = CROP_SIZE * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = CROP_SIZE * zoom;
      drawH = drawW / imgAspect;
    }

    const x = (CROP_SIZE - drawW) / 2 + offset.x;
    const y = (CROP_SIZE - drawH) / 2 + offset.y;

    ctx.save();
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();
  }, [zoom, offset, imgSize]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setOffsetStart({ ...offset });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setOffset({ x: offsetStart.x + dx, y: offsetStart.y + dy });
  };

  const handlePointerUp = () => setDragging(false);

  const clampZoom = (z: number) => Math.max(0.5, Math.min(5, z));

  const handleZoomIn = () => setZoom(z => clampZoom(z + 0.25));
  const handleZoomOut = () => setZoom(z => clampZoom(z - 0.25));
  const handleReset = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'avatar-cropped.jpg', { type: 'image/jpeg', lastModified: Date.now() });
      onCrop(file);
    }, 'image/jpeg', 0.92);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onClick={e => e.stopPropagation()}
          className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Crop Profile Picture</h3>
            <button onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Crop Area */}
          <div className="flex flex-col items-center gap-4 px-5 py-6">
            <div
              ref={containerRef}
              className="relative flex items-center justify-center"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* Background overlay with circular cutout */}
              <div className="absolute inset-0 pointer-events-none">
                <svg width={CROP_SIZE} height={CROP_SIZE} className="absolute inset-0">
                  <defs>
                    <mask id="cropMask">
                      <rect width={CROP_SIZE} height={CROP_SIZE} fill="white" />
                      <circle cx={CROP_SIZE / 2} cy={CROP_SIZE / 2} r={CROP_SIZE / 2} fill="black" />
                    </mask>
                  </defs>
                  <rect
                    width={CROP_SIZE}
                    height={CROP_SIZE}
                    fill="rgba(0,0,0,0.5)"
                    mask="url(#cropMask)"
                  />
                  <circle
                    cx={CROP_SIZE / 2}
                    cy={CROP_SIZE / 2}
                    r={CROP_SIZE / 2 - 1}
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="6 3"
                    opacity="0.7"
                  />
                </svg>
              </div>
              <canvas
                ref={canvasRef}
                width={CROP_SIZE}
                height={CROP_SIZE}
                className="rounded-full cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none' }}
              />
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-3">
              <button onClick={handleZoomOut} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                <ZoomOut className="h-4 w-4" />
              </button>
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.05"
                value={zoom}
                onChange={e => setZoom(clampZoom(parseFloat(e.target.value)))}
                className="h-2 w-40 cursor-pointer appearance-none rounded-full bg-slate-200 dark:bg-slate-700 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-500 [&::-webkit-slider-thumb]:shadow"
              />
              <button onClick={handleZoomIn} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={handleReset} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Drag to reposition. Use slider or buttons to zoom.</p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            <button onClick={onCancel} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirm}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 dark:shadow-indigo-900/40"
            >
              <Check className="h-4 w-4" />
              Apply Crop
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
