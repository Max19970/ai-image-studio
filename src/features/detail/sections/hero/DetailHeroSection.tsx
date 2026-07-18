import { useMemo, useState } from 'react';
import type { GeneratedImage } from '../../../../domain/generationTask';
import { downloadGenerationImagesArchive } from '../../../../processes/server-generation-actions';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { DetailActionContext, DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { useI18n } from '../../../../i18n';
import { CheckIcon, PlusIcon } from '../../../../shared/ui';
import { ResultCarousel } from '../carousel/DetailResultCarousel';
import { cx } from '../../model/detailHelpers';
import { DetailThumb } from './DetailThumb';
import styles from './DetailHeroSection.module.css';

export function DetailHeroSection({ context }: ElementDefinitionProps<DetailLayoutContext>) {
  const { t } = useI18n();
  const { task, activeImage, fallbackActiveImage, label, shouldUseCarousel } = context;
  const [selectedDownloadImageIds, setSelectedDownloadImageIds] = useState<Set<string>>(() => new Set());
  const snapshot = task.request;
  const detailActionContext: DetailActionContext = {
    activeImage,
    snapshot,
    isBatchSnapshot: snapshot.endpoint === 'multi',
    onRestoreRequest: context.onRestoreRequest,
    onStartHiresFix: (image) => context.onStartHiresFix?.(task, image) ?? Promise.resolve()
  };

  const selectImage = (image: typeof activeImage) => {
    if (!image) return;
    context.setActiveImage(image);
    context.onSelectImage?.(image);
  };

  const downloadableImages = useMemo(() => task.images.filter((image) => image.src || image.storageAssetKey), [task.images]);
  const selectedDownloadImages = useMemo(
    () => downloadableImages.filter((image) => selectedDownloadImageIds.has(image.id)),
    [downloadableImages, selectedDownloadImageIds]
  );
  const allDownloadImagesSelected = downloadableImages.length > 0 && selectedDownloadImages.length === downloadableImages.length;
  const toggleDownloadImage = (image: GeneratedImage) => {
    setSelectedDownloadImageIds((current) => {
      const next = new Set(current);
      if (next.has(image.id)) next.delete(image.id);
      else next.add(image.id);
      return next;
    });
  };
  const selectAllDownloadImages = () => setSelectedDownloadImageIds(new Set(downloadableImages.map((image) => image.id)));
  const clearDownloadImages = () => setSelectedDownloadImageIds(new Set());
  const downloadSelectedImages = () => {
    if (selectedDownloadImages.length === 0) return;
    const imageRefs = selectedDownloadImages.map((image) => ({
      taskId: task.id,
      imageId: image.id,
      storageAssetKey: image.storageAssetKey,
      filename: image.filename || `image-${image.index + 1}.${(image.format || 'png').replace(/^image\//, '')}`
    }));
    void downloadGenerationImagesArchive(imageRefs, `${task.id}-images.zip`).catch((error) => {
      window.alert(error instanceof Error ? error.message : String(error));
    });
  };

  return (
    <section className={styles.heroWrap} aria-label={t('detail.imageStage')} data-detail-slot="hero">
      <div className={cx(styles.heroOrbit, styles.heroOrbitLeft)} aria-hidden="true">{task.batch ? t('gallery.kind.batch') : t('detail.prompt')}</div>
      <section className={cx(styles.heroCard, 'glass-panel', shouldUseCarousel && styles.hasCarousel)}>
        <div className={styles.imageStage} data-detail-slot="image-stage">
          {shouldUseCarousel ? (
            <ResultCarousel
              task={task}
              initialImage={fallbackActiveImage}
              onSelectImage={selectImage}
            />
          ) : activeImage ? (
            <>
              <img className={styles.singleImage} src={activeImage.src} alt={t('detail.generatedAlt', { index: activeImage.index + 1 })} loading="eager" decoding="async" />
            </>
          ) : (
            <div className={styles.placeholderState}>
              <div className="gallery-spinner" aria-hidden="true" />
              <strong>{label}</strong>
              <p>{task.status === 'failed' ? (task.error || t('detail.failedFallback')) : t('detail.processingFallback')}</p>
            </div>
          )}
        </div>

        {task.images.length > 1 && (
          <div className={styles.outputDeck} data-detail-slot="output-strip">
            <div className={styles.outputTools}>
              <span>{t('detail.imageSelectionCount', { count: selectedDownloadImages.length, total: downloadableImages.length })}</span>
              <button type="button" onClick={allDownloadImagesSelected ? clearDownloadImages : selectAllDownloadImages}>
                {allDownloadImagesSelected ? t('detail.clearImageSelection') : t('detail.selectAllImages')}
              </button>
              <button type="button" disabled={selectedDownloadImages.length === 0} onClick={downloadSelectedImages}>
                {t('detail.downloadSelectedImages')}
              </button>
            </div>
            <div className={styles.outputStrip}>
              {task.images.map((item) => {
                const selected = selectedDownloadImageIds.has(item.id);
                return (
                  <div key={item.id} className={styles.thumbChoice} data-selected={selected ? 'true' : 'false'}>
                    <DetailThumb item={item} active={activeImage?.id === item.id} onClick={() => selectImage(item)} />
                    <button
                      type="button"
                      className={styles.thumbSelect}
                      aria-pressed={selected}
                      aria-label={t('detail.selectImageForArchive', { index: item.index + 1 })}
                      onClick={() => toggleDownloadImage(item)}
                    >
                      {selected ? <CheckIcon size={15} strokeWidth={2.4} /> : <PlusIcon size={15} strokeWidth={2.2} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <SlotHost<DetailActionContext> slot="detail/actions" context={detailActionContext} className={styles.actionBar} />
      </section>
      <div className={cx(styles.heroOrbit, styles.heroOrbitRight)} aria-hidden="true">{shouldUseCarousel ? t('detail.carousel') : 'JSON'}</div>
    </section>
  );
}
