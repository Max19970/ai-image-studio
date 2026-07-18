import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeneratedImage, GenerationTask } from '../../../../domain/generationTask';
import { useI18n } from '../../../../i18n';
import { isTerminalGenerationStatus } from '../../../../domain/generationStatus';
import { useOptimizedImageSrc } from '../../../../shared/image';
import { ChevronLeftIcon, ChevronRightIcon } from '../../../../shared/ui';
import { cx, expectedImageCount } from '../../model/detailHelpers';
import { getVisibleCarouselSlides, type CarouselSlidePlacement } from './carouselWindow';
import styles from './DetailResultCarousel.module.css';

type CarouselSlide = { type: 'image'; image: GeneratedImage } | { type: 'pending'; id: string };

function ResultCarouselSlide({ slide, className, onClick }: { slide: CarouselSlide; className: string; onClick: () => void }) {
  const { t } = useI18n();
  const thumbnailSrc = useOptimizedImageSrc(slide.type === 'image' ? slide.image.src : '', 1200, { skipOptimization: slide.type === 'image' && slide.image.kind === 'partial' });

  return (
    <button type="button" className={cx(styles.carouselSlide, className)} onClick={onClick}>
      {slide.type === 'image' ? (
        <img src={thumbnailSrc} alt={t('detail.generatedAlt', { index: slide.image.index + 1 })} loading="eager" decoding="async" />
      ) : (
        <div className={styles.carouselPendingState}>
          <div className="gallery-spinner" aria-hidden="true" />
          <strong>{t('detail.generatingNext')}</strong>
          <p>{t('detail.processingFallback')}</p>
        </div>
      )}
    </button>
  );
}

export function ResultCarousel({
  task,
  initialImage,
  onSelectImage
}: {
  task: GenerationTask;
  initialImage: GeneratedImage | null;
  onSelectImage?: (image: GeneratedImage) => void;
}) {
  const { t } = useI18n();
  const expected = expectedImageCount(task);
  const shouldShowPending = !isTerminalGenerationStatus(task.status) && task.images.length < expected;
  const slides = useMemo<CarouselSlide[]>(() => {
    const imageSlides: CarouselSlide[] = task.images.map((item) => ({ type: 'image', image: item }));
    if (shouldShowPending) imageSlides.push({ type: 'pending', id: 'pending' });
    return imageSlides.length > 0 ? imageSlides : [{ type: 'pending', id: 'pending' }];
  }, [task.images, shouldShowPending]);

  const findInitialIndex = () => {
    if (!initialImage) return 0;
    const next = slides.findIndex((slide) => slide.type === 'image' && slide.image.id === initialImage.id);
    return next >= 0 ? next : 0;
  };

  const [activeIndex, setActiveIndex] = useState(findInitialIndex);
  const lastSyncedInitialIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const initialId = initialImage?.id ?? null;
    if (lastSyncedInitialIdRef.current === initialId) return;
    lastSyncedInitialIdRef.current = initialId;
    if (!initialImage) return;
    const next = slides.findIndex((slide) => slide.type === 'image' && slide.image.id === initialImage.id);
    if (next >= 0) setActiveIndex(next);
  }, [initialImage, slides]);

  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(Math.max(0, slides.length - 1));
  }, [activeIndex, slides.length]);

  const selectIndex = (index: number, notify = true) => {
    const nextIndex = (index + slides.length) % slides.length;
    setActiveIndex(nextIndex);
    const selected = slides[nextIndex];
    if (notify && selected?.type === 'image') onSelectImage?.(selected.image);
  };

  const go = (delta: number) => selectIndex(activeIndex + delta);

  const visibleSlides = useMemo(() => getVisibleCarouselSlides(slides, activeIndex), [slides, activeIndex]);

  const placementClass = (placement: CarouselSlidePlacement) => {
    if (placement === 'active') return styles.carouselActive;
    if (placement === 'prev') return styles.carouselPrev;
    return styles.carouselNext;
  };

  return (
    <div className={styles.carouselStage}>
      <div className={styles.carouselViewport} aria-label={t('detail.carouselAria')}>
        {visibleSlides.map(({ slide, index, placement }) => (
          <ResultCarouselSlide
            key={slide.type === 'image' ? slide.image.id : slide.id}
            slide={slide}
            className={placementClass(placement)}
            onClick={() => selectIndex(index)}
          />
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button type="button" className={cx(styles.carouselNav, styles.carouselNavPrev)} onClick={() => go(-1)} aria-label={t('detail.prevImage')}>
            <ChevronLeftIcon size={22} />
          </button>
          <button type="button" className={cx(styles.carouselNav, styles.carouselNavNext)} onClick={() => go(1)} aria-label={t('detail.nextImage')}>
            <ChevronRightIcon size={22} />
          </button>
          <span className={styles.carouselCounter}>{activeIndex + 1} / {slides.length}</span>
        </>
      )}
    </div>
  );
}
