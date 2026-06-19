import { useState } from 'react';
import { useI18n } from '../../../i18n';
import { useOptimizedImageSrc } from '../../image';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import styles from './AttachmentImageStrip.module.css';

import type { AttachmentPreviewItem } from '../../image/attachmentPreviewTypes';
export type { AttachmentPreviewItem } from '../../image/attachmentPreviewTypes';
interface StripProps {
  items: AttachmentPreviewItem[];
  onRemove?: (item: AttachmentPreviewItem) => void;
  className?: string;
  chipClassName?: string;
  ariaLabel?: string;
  size?: 'compact' | 'regular';
}

function roleBadge(role: AttachmentPreviewItem['role'], t: (key: string) => string) {
  if (role === 'target') return t('attachment.badge.target');
  if (role === 'mask') return t('attachment.badge.mask');
  if (role === 'image') return t('attachment.badge.image');
  return t('attachment.badge.reference');
}

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function roleClass(role: AttachmentPreviewItem['role']) {
  if (role === 'target') return styles.roleTarget;
  if (role === 'mask') return styles.roleMask;
  if (role === 'image') return styles.roleImage;
  return styles.roleReference;
}

function badgeClass(role: AttachmentPreviewItem['role']) {
  if (role === 'target') return styles.badgeTarget;
  if (role === 'mask') return styles.badgeMask;
  if (role === 'image') return styles.badgeImage;
  return styles.badgeReference;
}

function AttachmentImageChip({ item, onOpen, onRemove, size = 'regular', className }: { item: AttachmentPreviewItem; onOpen: () => void; onRemove?: () => void; size?: 'compact' | 'regular'; className?: string }) {
  const { t } = useI18n();
  const thumbnailSrc = useOptimizedImageSrc(item.previewUrl, size === 'compact' ? 96 : 180);

  return (
    <figure className={cx(styles.chip, size === 'compact' && styles.compact, roleClass(item.role), className)} title={`${roleBadge(item.role, t)} · ${item.name}`}>
      <button type="button" className={styles.openButton} data-testid="attachment-preview-open" data-attachment-role={item.role} onClick={onOpen} aria-label={t('attachment.open', { name: item.name })}>
        {thumbnailSrc ? (
          <img src={thumbnailSrc} alt={item.name} loading="lazy" decoding="async" />
        ) : (
          <span className={styles.fallback}>IMG</span>
        )}
        <span className={cx(styles.roleBadge, badgeClass(item.role))}>{roleBadge(item.role, t)}</span>
      </button>
      {onRemove && (
        <button type="button" className={styles.removeButton} onClick={(event) => { event.stopPropagation(); onRemove(); }} aria-label={t('attachment.remove', { name: item.name })}>×</button>
      )}
    </figure>
  );
}

export function AttachmentImageStrip({ items, onRemove, className = '', chipClassName, ariaLabel, size = 'regular' }: StripProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<AttachmentPreviewItem | null>(null);

  return (
    <>
      <div className={cx(styles.strip, className)} aria-label={ariaLabel ?? t('attachment.ariaDefault')}>
        {items.map((item) => (
          <AttachmentImageChip
            key={item.id}
            item={item}
            size={size}
            className={chipClassName}
            onOpen={() => setSelected(item)}
            onRemove={onRemove ? () => onRemove(item) : undefined}
          />
        ))}
      </div>
      <AttachmentPreviewModal open={Boolean(selected)} attachment={selected} onClose={() => setSelected(null)} />
    </>
  );
}
