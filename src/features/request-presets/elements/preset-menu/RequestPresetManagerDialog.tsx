import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BottomSheet } from '../../../../shared/ui';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { useI18n } from '../../../../i18n';
import styles from './RequestPresetMenuAction.module.css';
import { PresetPanel } from './RequestPresetPanel';
import type { RequestPresetManagerController } from './requestPresetMenuController';

interface RequestPresetManagerDialogProps {
  open: boolean;
  controller: RequestPresetManagerController;
  onClose: () => void;
  testId?: string;
}

export function RequestPresetManagerDialog({ open, controller, onClose, testId = 'request-presets-dialog' }: RequestPresetManagerDialogProps) {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 860px)');
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || isMobile) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    requestAnimationFrame(() => dialogRef.current?.focus({ preventScroll: true }));
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, onClose, open]);

  if (!open) return null;

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        title={t('requestPresets.title')}
        description={t('requestPresets.description')}
        size="content"
        compactHeader
        scrollHint
        onClose={onClose}
      >
        <PresetPanel controller={controller} close={onClose} />
      </BottomSheet>
    );
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className={styles.dialogBackdrop} data-testid={testId} onPointerDown={onClose}>
      <div
        ref={dialogRef}
        className={styles.dialogShell}
        role="dialog"
        aria-modal="true"
        aria-label={t('requestPresets.title')}
        tabIndex={-1}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.dialogClose} aria-label={t('requestPresets.close')} onClick={onClose}>×</button>
        <PresetPanel controller={controller} close={onClose} />
      </div>
    </div>,
    document.body
  );
}
