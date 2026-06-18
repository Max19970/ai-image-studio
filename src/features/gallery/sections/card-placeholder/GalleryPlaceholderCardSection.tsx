import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { GalleryCardActionContext, GalleryTaskCardContext } from '../../../../interface/context/workspace/gallery';
import { SlotHost } from '../../../../interface/SlotHost';
import { Card } from '../../../../shared/ui';
import { useI18n } from '../../../../i18n';
import styles from '../../../gallery/ResultsGallery.module.css';
import { cx, GalleryStatusPill, useGalleryStatusLabel } from '../../galleryUi';

export function GalleryPlaceholderCardSection({ context }: ElementDefinitionProps<GalleryTaskCardContext>) {
  const { t } = useI18n();
  const { task } = context;
  const label = useGalleryStatusLabel(task.status);

  return (
    <Card as="article" interactive className={cx(styles.card, styles.statusCard, task.status === 'failed' && styles.statusFailed)} data-gallery-slot="card">
      <button type="button" className={styles.openButton} data-testid="gallery-card-open" onClick={() => context.onOpenTask()} aria-label={t('gallery.openDetails')}>
        <div className={styles.placeholder} data-gallery-slot="card-body">
          <div className={styles.spinner} aria-hidden="true" />
          <strong>{label}</strong>
          <p>{task.status === 'failed' ? (task.error || t('gallery.requestFailed')) : t('gallery.requestSent')}</p>
        </div>
      </button>
      <SlotHost<GalleryCardActionContext> slot="gallery/card-actions" context={{ task, activeImage: null, galleryIndex: context.index, onDeleteTask: context.onDeleteTask }} as={null} />
      <footer className={styles.footer} data-gallery-slot="card-footer">
        <div className={styles.footerMeta}>
          <span>{task.kind === 'batch' ? t('gallery.kind.batch') : t(`gallery.mode.${task.request.mode}`)}</span>
          <strong>{new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
        </div>
        <GalleryStatusPill status={task.status}>{label}</GalleryStatusPill>
      </footer>
    </Card>
  );
}
