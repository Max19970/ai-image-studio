import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import type { AttachmentPreviewItem } from './AttachmentImageStrip';

interface Props {
  open: boolean;
  attachment: AttachmentPreviewItem | null;
  onClose: () => void;
}

function orientationClass(width?: number, height?: number) {
  if (!width || !height) return 'orientation-unknown';
  const ratio = width / height;
  if (ratio > 1.12) return 'orientation-landscape';
  if (ratio < 0.88) return 'orientation-portrait';
  return 'orientation-square';
}

export function AttachmentPreviewModal({ open, attachment, onClose }: Props) {
  const { t } = useI18n();
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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
    <div className="modal-backdrop attachment-preview-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className={`attachment-modal glass-panel ${orientationClass(naturalSize?.width, naturalSize?.height)}`} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-topbar compact attachment-modal-header">
          <div>
            <p className="section-kicker">{t('attachment.preview')}</p>
            <h2 className="section-title">{roleTitle}</h2>
            <p className="modal-subcopy">{roleHint}</p>
          </div>
          <button className="icon-button modal-close-button" onClick={onClose} aria-label={t('attachment.close')}>×</button>
        </header>

        <div className="attachment-modal-layout">
          <div className={`attachment-modal-stage role-${attachment.role}`} style={stageStyle}>
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
              <div className="detail-attachment-fallback large">IMG</div>
            )}
          </div>

          <aside className="detail-stack attachment-file-panel">
            <section className="detail-card">
              <span className="section-kicker">{t('attachment.file')}</span>
              <div className="attachment-role-large">
                <span className={`attachment-role-dot role-${attachment.role}`} />
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
