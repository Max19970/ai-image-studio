import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModalDialog } from '../../hooks/useModalDialog';
import { XIcon } from '../Icon';
import styles from './BottomSheet.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export type BottomSheetSize = 'compact' | 'content' | 'half' | 'full';

export interface BottomSheetProps {
  open: boolean;
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: BottomSheetSize;
  closeOnBackdrop?: boolean;
  compactHeader?: boolean;
  scrollHint?: boolean;
  className?: string;
  ariaLabel?: string;
  closeLabel?: string;
  onClose: () => void;
}

export function BottomSheet({
  open,
  children,
  title,
  description,
  footer,
  size = 'content',
  closeOnBackdrop = true,
  compactHeader = false,
  scrollHint = false,
  className,
  ariaLabel,
  closeLabel = 'Close dialog',
  onClose
}: BottomSheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);

  useModalDialog({ open, rootRef, dialogRef: sheetRef, onClose });

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={styles.backdrop}
        aria-hidden="true"
        tabIndex={-1}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cx(styles.sheet, styles[size], compactHeader && styles.compactHeader, scrollHint && styles.scrollHint, className)}
      >
        <span className={styles.handle} aria-hidden="true" />
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            {title && <h2 id={titleId}>{title}</h2>}
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label={closeLabel}>
            <XIcon size={18} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </section>
    </div>,
    document.body
  );
}
