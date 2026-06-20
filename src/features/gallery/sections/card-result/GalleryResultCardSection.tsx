import { useEffect, useRef, useState } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { GalleryCardActionContext, GalleryTaskCardContext } from '../../../../interface/context/workspace/gallery';
import { SlotHost } from '../../../../interface/SlotHost';
import { useOptimizedImageSrc } from '../../../../shared/image';
import { useGalleryAutoAdvance } from '../../model/useGalleryAutoAdvance';
import { useI18n } from '../../../../i18n';
import { isTerminalGenerationStatus } from '../../../../domain/generationStatus';
import styles from '../shared/GalleryTileSection.module.css';
import { cx, GalleryStatusPill, useGalleryStatusLabel } from '../../galleryUi';

export function GalleryResultCardSection({ context }: ElementDefinitionProps<GalleryTaskCardContext>) {
  const { t } = useI18n();
  const { task, index } = context;
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const tileRef = useRef<HTMLElement | null>(null);
  const label = useGalleryStatusLabel(task.status);
  const activeImage = task.images[Math.min(activeIndex, Math.max(0, task.images.length - 1))] ?? null;
  const hasStoredThumbnail = Boolean(activeImage?.thumbnailSrc);
  const thumbnailSrc = useOptimizedImageSrc(activeImage?.thumbnailSrc ?? activeImage?.src ?? '', 620, { skipOptimization: hasStoredThumbnail });
  const isBatch = task.kind === 'batch';
  const hasMultiple = isBatch || task.images.length > 1;
  const shouldShowStatusPill = activeImage?.kind === 'partial' || !isTerminalGenerationStatus(task.status);
  const canAutoAdvance = useGalleryAutoAdvance(tileRef, task.images.length > 1);
  const actionContext: GalleryCardActionContext = {
    task,
    activeImage,
    galleryIndex: index,
    onOpenTask: context.onOpenTask,
    onDeleteTask: context.onDeleteTask,
    onStartHiresFix: () => context.onStartHiresFix(activeImage)
  };

  useEffect(() => {
    if (task.images.length <= 1 || !canAutoAdvance) return;
    const id = window.setInterval(() => {
      setSlideDirection('next');
      setActiveIndex((value) => (value + 1) % task.images.length);
    }, 1700);
    return () => window.clearInterval(id);
  }, [canAutoAdvance, task.images.length]);

  useEffect(() => {
    if (activeIndex >= task.images.length) setActiveIndex(Math.max(0, task.images.length - 1));
  }, [activeIndex, task.images.length]);

  return (
    <article
      ref={tileRef}
      className={cx(styles.tile, styles.resultTile, hasMultiple && styles.sequenceTile, task.status === 'failed' && styles.statusFailed)}
      data-gallery-slot="tile"
    >
      <button
        type="button"
        className={styles.tileMediaButton}
        data-gallery-slot="tile-body"
        data-testid="gallery-card-open"
        onClick={() => context.onOpenTask(activeImage ?? undefined)}
        aria-label={t('gallery.openImage', { index: index + 1 })}
      >
        {activeImage ? (
          <img
            key={activeImage.id}
            className={cx(styles.tileImage, slideDirection === 'next' ? styles.slideNext : styles.slidePrev)}
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
        {shouldShowStatusPill ? (
          <GalleryStatusPill status={task.status} floating>{activeImage?.kind === 'partial' ? t('gallery.kind.partial') : label}</GalleryStatusPill>
        ) : null}
        {hasMultiple && (
          <span className={styles.sequenceBadge}>
            <span aria-hidden="true">↻</span>
            {t('gallery.sequenceCount', { count: task.images.length })}
          </span>
        )}
      </button>
      <div className={styles.tileOverlay} aria-hidden="false">
        <div className={styles.tileActionGroup}>
          <SlotHost<GalleryCardActionContext> slot="gallery/card-quick-actions" context={actionContext} as={null} />
        </div>
      </div>
    </article>
  );
}
