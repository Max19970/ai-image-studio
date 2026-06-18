import { useEffect, useState } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { GalleryCardActionContext, GalleryTaskCardContext } from '../../../../interface/context/workspace/gallery';
import { SlotHost } from '../../../../interface/SlotHost';
import { useOptimizedImageSrc } from '../../../../shared/image';
import { Card } from '../../../../shared/ui';
import { useI18n } from '../../../../i18n';
import styles from '../../../gallery/ResultsGallery.module.css';
import { cx, GalleryStatusPill, useGalleryStatusLabel } from '../../galleryUi';

export function GalleryResultCardSection({ context }: ElementDefinitionProps<GalleryTaskCardContext>) {
  const { t } = useI18n();
  const { task, index } = context;
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const label = useGalleryStatusLabel(task.status);
  const activeImage = task.images[Math.min(activeIndex, Math.max(0, task.images.length - 1))] ?? null;
  const thumbnailSrc = useOptimizedImageSrc(activeImage?.thumbnailSrc ?? activeImage?.src ?? '', 560);
  const created = new Date(task.updatedAt || task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isBatch = task.kind === 'batch';
  const hasMultiple = isBatch || task.images.length > 1;
  const modeText = isBatch
    ? t('gallery.kind.batchWithCount', { count: task.batch?.items.length ?? 0 })
    : t(`gallery.mode.${task.request.mode}`);

  useEffect(() => {
    if (task.images.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideDirection('next');
      setActiveIndex((value) => (value + 1) % task.images.length);
    }, 1700);
    return () => window.clearInterval(id);
  }, [task.images.length]);

  useEffect(() => {
    if (activeIndex >= task.images.length) setActiveIndex(Math.max(0, task.images.length - 1));
  }, [activeIndex, task.images.length]);

  return (
    <Card as="article" interactive className={cx(styles.card, hasMultiple && styles.sequenceCard, task.status === 'failed' && styles.statusFailed)} data-gallery-slot="card">
      <button type="button" className={styles.openButton} data-gallery-slot="card-body" data-testid="gallery-card-open" onClick={() => context.onOpenTask(activeImage ?? undefined)} aria-label={t('gallery.openImage', { index: index + 1 })}>
          {activeImage ? (
            <img
              key={activeImage.id}
              className={cx(styles.slideImage, slideDirection === 'next' ? styles.slideNext : styles.slidePrev)}
              src={thumbnailSrc}
              alt={t('gallery.generatedAlt', { index: activeImage.index + 1 })}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className={styles.placeholder}>
              <div className={styles.spinner} aria-hidden="true" />
              <strong>{label}</strong>
              <p>{task.status === 'failed' ? (task.error || t('gallery.requestFailed')) : t('gallery.requestSent')}</p>
            </div>
        )}
        <GalleryStatusPill status={task.status} floating>{activeImage?.kind === 'partial' ? t('gallery.kind.partial') : label}</GalleryStatusPill>
        {hasMultiple && (
          <span className={styles.sequenceBadge}>
            <span aria-hidden="true">↻</span>
            {t('gallery.sequenceCount', { count: task.images.length })}
          </span>
        )}
      </button>
      <SlotHost<GalleryCardActionContext> slot="gallery/card-actions" context={{ task, activeImage, galleryIndex: index, onDeleteTask: context.onDeleteTask }} as={null} />
      <footer className={styles.footer} data-gallery-slot="card-footer">
        <div className={styles.footerMeta}>
          <span>{modeText}{activeImage ? ` · #${activeImage.index + 1}` : ''}</span>
          <strong>{created}</strong>
        </div>
        <SlotHost<GalleryCardActionContext> slot="gallery/card-footer-actions" context={{ task, activeImage, galleryIndex: index, onDeleteTask: context.onDeleteTask }} />
      </footer>
    </Card>
  );
}
