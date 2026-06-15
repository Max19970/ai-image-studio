import { useState } from 'react';
import { useI18n } from '../i18n';
import { useOptimizedImageSrc } from '../infrastructure/imageOptimization';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

export type AttachmentPreviewItem = {
  id: string;
  role: 'target' | 'reference' | 'mask';
  label: string;
  name: string;
  size: number;
  type?: string;
  previewUrl?: string;
  lastModified?: number;
};

interface StripProps {
  items: AttachmentPreviewItem[];
  onRemove?: (item: AttachmentPreviewItem) => void;
  className?: string;
  ariaLabel?: string;
  size?: 'compact' | 'regular';
}

function roleBadge(role: AttachmentPreviewItem['role'], t: (key: string) => string) {
  if (role === 'target') return t('attachment.badge.target');
  if (role === 'mask') return t('attachment.badge.mask');
  return t('attachment.badge.reference');
}

function AttachmentImageChip({ item, onOpen, onRemove, size = 'regular' }: { item: AttachmentPreviewItem; onOpen: () => void; onRemove?: () => void; size?: 'compact' | 'regular' }) {
  const { t } = useI18n();
  const thumbnailSrc = useOptimizedImageSrc(item.previewUrl, size === 'compact' ? 96 : 180);

  return (
    <figure className={`attachment-image-chip ${size} role-${item.role}`} title={`${roleBadge(item.role, t)} · ${item.name}`}>
      <button type="button" className="attachment-image-open" onClick={onOpen} aria-label={t('attachment.open', { name: item.name })}>
        {thumbnailSrc ? (
          <img src={thumbnailSrc} alt={item.name} loading="lazy" decoding="async" />
        ) : (
          <span className="attachment-image-fallback">IMG</span>
        )}
        <span className={`attachment-role-badge role-${item.role}`}>{roleBadge(item.role, t)}</span>
      </button>
      {onRemove && (
        <button type="button" className="attachment-image-remove" onClick={(event) => { event.stopPropagation(); onRemove(); }} aria-label={t('attachment.remove', { name: item.name })}>×</button>
      )}
    </figure>
  );
}

export function AttachmentImageStrip({ items, onRemove, className = '', ariaLabel, size = 'regular' }: StripProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<AttachmentPreviewItem | null>(null);

  return (
    <>
      <div className={`attachment-image-strip ${className}`} aria-label={ariaLabel ?? t('attachment.ariaDefault')}>
        {items.map((item) => (
          <AttachmentImageChip
            key={item.id}
            item={item}
            size={size}
            onOpen={() => setSelected(item)}
            onRemove={onRemove ? () => onRemove(item) : undefined}
          />
        ))}
      </div>
      <AttachmentPreviewModal open={Boolean(selected)} attachment={selected} onClose={() => setSelected(null)} />
    </>
  );
}
