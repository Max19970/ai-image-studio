import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { DetailActionContext, DetailLayoutContext } from '../../../../interface/context/workspace/detail';
import { useI18n } from '../../../../i18n';
import { ResultCarousel } from '../carousel/DetailResultCarousel';
import { cx } from '../../model/detailHelpers';
import { DetailThumb } from './DetailThumb';
import styles from './DetailHeroSection.module.css';

export function DetailHeroSection({ context }: ElementDefinitionProps<DetailLayoutContext>) {
  const { t } = useI18n();
  const { task, activeImage, fallbackActiveImage, label, shouldUseCarousel } = context;
  const snapshot = task.request;
  const detailActionContext: DetailActionContext = {
    activeImage,
    snapshot,
    isBatchSnapshot: snapshot.endpoint === 'multi',
    onRestoreRequest: context.onRestoreRequest
  };

  const selectImage = (image: typeof activeImage) => {
    if (!image) return;
    context.setActiveImage(image);
    context.onSelectImage?.(image);
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
          <div className={styles.outputStrip} data-detail-slot="output-strip">
            {task.images.map((item) => (
              <DetailThumb key={item.id} item={item} active={activeImage?.id === item.id} onClick={() => selectImage(item)} />
            ))}
          </div>
        )}

        <SlotHost<DetailActionContext> slot="detail/actions" context={detailActionContext} className={styles.actionBar} />
      </section>
      <div className={cx(styles.heroOrbit, styles.heroOrbitRight)} aria-hidden="true">{shouldUseCarousel ? t('detail.carousel') : 'JSON'}</div>
    </section>
  );
}
