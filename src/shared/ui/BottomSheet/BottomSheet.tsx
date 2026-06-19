import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
  onClose
}: BottomSheetProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.root}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close sheet"
        tabIndex={closeOnBackdrop ? 0 : -1}
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={cx(styles.sheet, styles[size], compactHeader && styles.compactHeader, scrollHint && styles.scrollHint, className)}
      >
        <span className={styles.handle} aria-hidden="true" />
        {(title || description) && (
          <header className={styles.header}>
            {title && <h2 id={titleId}>{title}</h2>}
            {description && <p id={descriptionId}>{description}</p>}
          </header>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </section>
    </div>,
    document.body
  );
}
