import { useCallback, useEffect, useRef, useState } from 'react';

export function useScaleToFit(contentWidth: number, enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [wrapHeight, setWrapHeight] = useState(0);

  const recompute = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content || !enabled || contentWidth <= 0) {
      setScale(1);
      setWrapHeight(0);
      return;
    }
    const avail = container.clientWidth;
    if (avail <= 0) return;
    const style = getComputedStyle(container);
    const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
    const usable = avail - padX;
    if (usable <= 0) return;
    const next = Math.min(1, usable / contentWidth);
    setScale(next);
    setWrapHeight(Math.ceil(content.offsetHeight * next));
  }, [contentWidth, enabled]);

  useEffect(() => {
    recompute();
    if (!enabled || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => recompute());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [recompute, enabled]);

  useEffect(() => {
    const t = window.setTimeout(recompute, 60);
    return () => window.clearTimeout(t);
  }, [recompute]);

  return { containerRef, contentRef, scale, wrapHeight };
}