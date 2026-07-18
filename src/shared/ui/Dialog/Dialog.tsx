import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '../../hooks/useModalDialog';
import { XIcon } from '../Icon';
import styles from './Dialog.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export type DialogSize = 'compact' | 'content' | 'wide';
export type DialogTone = 'neutral' | 'danger';

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  children?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: DialogSize;
  tone?: DialogTone;
  closeLabel: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  testId?: string;
  onClose: () => void;
}

export function Dialog({
  open,
  title,
  children,
  description,
  footer,
  size = 'content',
  tone = 'neutral',
  closeLabel,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  testId,
  onClose
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

  useModalDialog({ open, rootRef, dialogRef, onClose, closeOnEscape });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={rootRef}
      className={styles.root}
      data-testid={testId}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx(styles.dialog, styles[size], tone === 'danger' && styles.danger, className)}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={closeLabel}>
            <XIcon size={18} />
          </button>
        </header>
        {children && <div className={styles.body}>{children}</div>}
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </section>
    </div>,
    document.body
  );
}
