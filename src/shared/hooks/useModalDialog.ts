import { useEffect, useRef, type RefObject } from 'react';
import { createModalIsolationManager } from './modalIsolation';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

interface ActiveModal {
  dialog: HTMLElement;
}

const modalIsolation = createModalIsolationManager<Element>();
const activeModals: ActiveModal[] = [];

function getFocusableElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  });
}

function focusDialog(dialog: HTMLElement, initialFocusRef?: RefObject<HTMLElement | null>) {
  const requested = initialFocusRef?.current;
  if (requested && dialog.contains(requested)) {
    requested.focus({ preventScroll: true });
    return;
  }

  const marked = dialog.querySelector<HTMLElement>('[data-dialog-initial-focus="true"]');
  const firstFocusable = getFocusableElements(dialog)[0];
  (marked ?? firstFocusable ?? dialog).focus({ preventScroll: true });
}

function removeActiveModal(entry: ActiveModal) {
  const index = activeModals.lastIndexOf(entry);
  if (index >= 0) activeModals.splice(index, 1);
}

interface UseModalDialogOptions {
  open: boolean;
  rootRef: RefObject<HTMLElement | null>;
  dialogRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

export function useModalDialog({
  open,
  rootRef,
  dialogRef,
  onClose,
  closeOnEscape = true,
  initialFocusRef
}: UseModalDialogOptions) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const root = rootRef.current;
    const dialog = dialogRef.current;
    if (!root || !dialog) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const entry: ActiveModal = { dialog };
    const releaseIsolation = modalIsolation.acquire(document.body, root);
    activeModals.push(entry);

    const isTopMost = () => activeModals[activeModals.length - 1] === entry;
    const animationFrame = window.requestAnimationFrame(() => {
      if (isTopMost()) focusDialog(dialog, initialFocusRef);
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopMost()) return;

      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!isTopMost() || dialog.contains(event.target as Node)) return;
      focusDialog(dialog);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      removeActiveModal(entry);
      releaseIsolation();

      window.requestAnimationFrame(() => {
        if (previouslyFocused?.isConnected && !previouslyFocused.closest('[inert]')) {
          previouslyFocused.focus({ preventScroll: true });
          return;
        }

        const activeDialog = activeModals[activeModals.length - 1]?.dialog;
        if (activeDialog?.isConnected) focusDialog(activeDialog);
      });
    };
  }, [closeOnEscape, dialogRef, initialFocusRef, open, rootRef]);
}
