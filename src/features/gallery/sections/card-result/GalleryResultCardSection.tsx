import { useEffect, useState } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { GalleryCardActionContext, GalleryTaskCardContext } from '../../../../interface/context/workspace/gallery';
import { SlotHost } from '../../../../interface/SlotHost';
import { useOptimizedImageSrc } from '../../../../shared/image';
import { ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon } from '../../../../shared/ui';
import { useI18n } from '../../../../i18n';
import { isTerminalGenerationStatus } from '../../../../domain/generationStatus';
import styles from '../shared/GalleryTileSection.module.css';
import { cx, GalleryStatusPill, useGalleryStatusLabel } from '../../galleryUi';

export function GalleryResultCardSection({ context }: ElementDefinitionProps<GalleryTaskCardContext>) {
  const { t } = useI18n();
  const { task, index } = context;
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const label = useGalleryStatusLabel(task.status);
  const isActiveTask = !isTerminalGenerationStatus(task.status);
  const progressPercent = typeof task.progress?.percent === 'number' ? Math.round(task.progress.percent) : null;
  const activeImage = task.images[Math.min(activeIndex, Math.max(0, task.images.length - 1))] ?? null;
  const hasStoredThumbnail = Boolean(activeImage?.thumbnailSrc);
  const shouldSkipLiveOptimization = isActiveTask || activeImage?.kind === 'partial';
  const thumbnailSrc = useOptimizedImageSrc(activeImage?.thumbnailSrc ?? activeImage?.src ?? '', 620, { skipOptimization: hasStoredThumbnail || shouldSkipLiveOptimization });
  const hasMultiple = task.images.length > 1;
  const shouldShowStatusPill = activeImage?.kind === 'partial' || isActiveTask;
  const statusLabel = activeImage?.kind === 'partial' ? t('gallery.kind.partial') : label;
  const progressLabel = progressPercent !== null && isActiveTask ? `${progressPercent}% · ${statusLabel}` : statusLabel;
  const actionContext: GalleryCardActionContext = {
    task,
    activeImage,
    galleryIndex: index,
    onOpenTask: context.onOpenTask,
    onDeleteTask: context.onDeleteTask,
    onCancelTask: context.onCancelTask,
    onMoveTask: context.onMoveTask,
    pinned: context.pinned,
    tags: context.tags,
    onSetPinned: context.onSetPinned,
    onSetTags: context.onSetTags,
    onStartHiresFix: () => context.onStartHiresFix(activeImage)
  };

  useEffect(() => {
    if (isActiveTask && task.images.length > 0) setActiveIndex(task.images.length - 1);
  }, [isActiveTask, task.images.length]);

  const showPrevious = () => {
    setSlideDirection('prev');
    setActiveIndex((value) => (value - 1 + task.images.length) % task.images.length);
  };

  const showNext = () => {
    setSlideDirection('next');
    setActiveIndex((value) => (value + 1) % task.images.length);
  };

  useEffect(() => {
    if (activeIndex >= task.images.length) setActiveIndex(Math.max(0, task.images.length - 1));
  }, [activeIndex, task.images.length]);

  return (
    <article
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
          <GalleryStatusPill status={task.status} floating>{progressLabel}</GalleryStatusPill>
        ) : null}
        {hasMultiple && (
          <span className={styles.sequenceBadge}>
            <RotateCcwIcon size={13} strokeWidth={2} />
            {t('gallery.sequenceCount', { count: task.images.length })}
          </span>
        )}
      </button>
      {hasMultiple && (
        <div className={styles.sequenceControls} aria-label={t('gallery.sequenceControls')}>
          <button type="button" className={styles.sequenceControlButton} onClick={showPrevious} aria-label={t('gallery.sequencePrevious')}>
            <ChevronLeftIcon size={17} />
          </button>
          <span className={styles.sequencePosition} aria-live="polite">
            {t('gallery.sequencePosition', { current: activeIndex + 1, count: task.images.length })}
          </span>
          <button type="button" className={styles.sequenceControlButton} onClick={showNext} aria-label={t('gallery.sequenceNext')}>
            <ChevronRightIcon size={17} />
          </button>
        </div>
      )}
      <div className={styles.tileOverlay} aria-hidden="false">
        <div className={styles.tileActionGroup}>
          <SlotHost<GalleryCardActionContext> slot="gallery/card-quick-actions" context={actionContext} as={null} />
        </div>
      </div>
    </article>
  );
}
