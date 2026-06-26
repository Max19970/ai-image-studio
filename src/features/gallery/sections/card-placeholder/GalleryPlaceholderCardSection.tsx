import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { GalleryCardActionContext, GalleryTaskCardContext } from '../../../../interface/context/workspace/gallery';
import { SlotHost } from '../../../../interface/SlotHost';
import { useI18n } from '../../../../i18n';
import styles from '../shared/GalleryTileSection.module.css';
import { cx, GalleryStatusPill, useGalleryStatusLabel } from '../../galleryUi';

export function GalleryPlaceholderCardSection({ context }: ElementDefinitionProps<GalleryTaskCardContext>) {
  const { t } = useI18n();
  const { task } = context;
  const label = useGalleryStatusLabel(task.status);
  const progressPercent = typeof task.progress?.percent === 'number' ? Math.round(task.progress.percent) : null;
  const progressLabel = progressPercent !== null ? `${progressPercent}% · ${label}` : label;
  const actionContext: GalleryCardActionContext = {
    task,
    activeImage: null,
    galleryIndex: context.index,
    onOpenTask: context.onOpenTask,
    onDeleteTask: context.onDeleteTask,
    onCancelTask: context.onCancelTask,
    onMoveTask: context.onMoveTask,
    pinned: context.pinned,
    tags: context.tags,
    onSetPinned: context.onSetPinned,
    onSetTags: context.onSetTags,
    onStartHiresFix: () => context.onStartHiresFix(null)
  };

  return (
    <article
      className={cx(styles.tile, styles.statusTile, task.status === 'failed' && styles.statusFailed)}
      data-gallery-slot="tile"
    >
      <button type="button" className={styles.tileMediaButton} data-testid="gallery-card-open" onClick={() => context.onOpenTask()} aria-label={t('gallery.openDetails')}>
        <div className={styles.placeholder} data-gallery-slot="tile-body">
          <div className={styles.spinner} aria-hidden="true" />
          <strong>{label}</strong>
          <p>{task.status === 'failed' ? (task.error || t('gallery.requestFailed')) : t('gallery.requestSentShort')}</p>
        </div>
        <GalleryStatusPill status={task.status} floating>{progressLabel}</GalleryStatusPill>
      </button>
      <div className={styles.tileOverlay} aria-hidden="false">
        <div className={styles.tileActionGroup}>
          <SlotHost<GalleryCardActionContext> slot="gallery/card-quick-actions" context={actionContext} as={null} />
        </div>
      </div>
    </article>
  );
}
