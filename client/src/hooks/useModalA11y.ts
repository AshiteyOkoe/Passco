import { useEffect, useRef, type RefObject } from 'react';

interface ModalA11yOptions {
  onClose?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
  lockScroll?: boolean;
}

/**
 * Adds accessible-modal behavior to a dialog:
 * - moves focus inside when opened
 * - traps the Tab key within the dialog
 * - closes on Escape
 * - restores focus to the trigger on close
 * Returns a ref to attach to the dialog element.
 */
export function useModalA11y(open: boolean, { onClose, initialFocusRef, restoreFocus = true, lockScroll = true }: ModalA11yOptions = {}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    if (lockScroll) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [open, lockScroll]);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    const getFocusable = () => {
      if (!dialog) return [];
      return Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    };

    const target = initialFocusRef?.current ?? getFocusable()[0] ?? dialog;
    target?.focus?.();

    const handleKeyDown = (e: KeyboardEvent) => {
      const focusables = getFocusable();
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const inside = active && dialog?.contains(active);
      if (!inside) {
        e.preventDefault();
        first.focus();
        return;
      }

      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (restoreFocus) previousFocusRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { dialogRef };
}