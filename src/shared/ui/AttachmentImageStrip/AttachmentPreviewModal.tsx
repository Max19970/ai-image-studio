import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../../i18n';
import { IconButton } from '../IconButton';
import styles from './AttachmentPreviewModal.module.css';
import type { AttachmentPreviewItem } from '../../image/attachmentPreviewTypes';
import { useModalDialog } from '../../hooks/useModalDialog';

interface Props {
  open: boolean;
  attachment: AttachmentPreviewItem | null;
  onClose: () => void;
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function stageRoleClass(role: AttachmentPreviewItem['role']) {
  if (role === 'target') return styles.stageTarget;
  if (role === 'mask') return styles.stageMask;
  return undefined;
}

function dotRoleClass(role: AttachmentPreviewItem['role']) {
  if (role === 'target') return styles.roleDotTarget;
  if (role === 'mask') return styles.roleDotMask;
  return undefined;
}

export function AttachmentPreviewModal({ open, attachment, onClose }: Props) {
  const { t } = useI18n();
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  useModalDialog({ open, rootRef, dialogRef, onClose });

  useEffect(() => {
    if (!open) return;
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  useEffect(() => {
    setNaturalSize(null);
  }, [attachment?.id, open]);

  const stageStyle = useMemo(() => {
    if (!naturalSize) return undefined;

    const ratio = naturalSize.width / naturalSize.height;
    const wideLayout = viewport.width > 900;
    const availableWidth = Math.max(220, viewport.width - (wideLayout ? 430 : 58));
    const availableHeight = Math.max(220, viewport.height - (wideLayout ? 168 : 188));
    const maxByOrientation = ratio > 1.12 ? 1020 : ratio < 0.88 ? 620 : 760;
    const width = Math.max(180, Math.min(availableWidth, availableHeight * ratio, maxByOrientation));

    return {
      '--attachment-ratio': `${naturalSize.width} / ${naturalSize.height}`,
      '--attachment-stage-width': `${Math.round(width)}px`
    } as CSSProperties;
  }, [naturalSize, viewport]);

  if (!open || !attachment) return null;

  const roleTitle = t(`attachment.role.${attachment.role === 'reference' ? 'reference' : attachment.role}`);
  const roleHint = t(`attachment.hint.${attachment.role === 'reference' ? 'reference' : attachment.role}`);

  const modal = (
    <div ref={rootRef} className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="attachment-preview-title" tabIndex={-1} data-testid="attachment-preview-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <p className="section-kicker">{t('attachment.preview')}</p>
            <h2 id="attachment-preview-title" className="section-title">{roleTitle}</h2>
            <p className={styles.subcopy}>{roleHint}</p>
          </div>
          <IconButton className={styles.closeButton} onClick={onClose} aria-label={t('attachment.close')}>×</IconButton>
        </header>

        <div className={styles.layout}>
          <div className={cx(styles.stage, stageRoleClass(attachment.role))} style={stageStyle}>
            {attachment.previewUrl ? (
              <img
                src={attachment.previewUrl}
                alt={attachment.name}
                loading="eager"
                decoding="async"
                onLoad={(event) => {
                  const img = event.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                  }
                }}
              />
            ) : (
              <div className={styles.fallbackLarge}>IMG</div>
            )}
          </div>

          <aside className={`detail-stack ${styles.filePanel}`}>
            <section className="detail-card">
              <span className="section-kicker">{t('attachment.file')}</span>
              <div className={styles.roleLarge}>
                <span className={cx(styles.roleDot, dotRoleClass(attachment.role))} />
                <strong>{roleTitle}</strong>
              </div>
              <div className="detail-grid">
                <div className="detail-row"><span>{t('attachment.role')}</span><strong>{roleTitle}</strong></div>
                <div className="detail-row"><span>{t('attachment.label')}</span><strong>{attachment.label}</strong></div>
                <div className="detail-row"><span>{t('attachment.name')}</span><strong>{attachment.name}</strong></div>
                <div className="detail-row"><span>{t('attachment.type')}</span><strong>{attachment.type || t('attachment.unknown')}</strong></div>
                <div className="detail-row"><span>{t('attachment.size')}</span><strong>{(attachment.size / 1024 / 1024).toFixed(2)} MB</strong></div>
                {naturalSize && <div className="detail-row"><span>{t('attachment.dimensions')}</span><strong>{naturalSize.width} × {naturalSize.height}</strong></div>}
                {attachment.lastModified && <div className="detail-row"><span>{t('attachment.modified')}</span><strong>{new Date(attachment.lastModified).toLocaleString()}</strong></div>}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
