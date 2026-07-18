import type { MouseEvent } from 'react';
import type { GalleryHeaderActionContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import { IconButton, Trash2Icon } from '../../../../shared/ui';
import styles from '../../ResultsGallery.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export function GalleryCountPill({ archive, busy }: Pick<GalleryHeaderActionContext, 'archive' | 'busy'>) {
  const { t } = useI18n();
  return (
    <div className={styles.count}>
      <strong>{archive.filteredCount}</strong>
      <span>{busy ? t('gallery.running') : t('gallery.items')}</span>
    </div>
  );
}

export function GalleryDeleteButton({ className, onClick, ariaLabel }: { className?: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void; ariaLabel: string }) {
  return (
    <IconButton size="micro" tone="danger" className={cx(styles.deleteButton, className)} data-gallery-action="delete" onClick={onClick} aria-label={ariaLabel}>
      <Trash2Icon size={15} />
    </IconButton>
  );
}
