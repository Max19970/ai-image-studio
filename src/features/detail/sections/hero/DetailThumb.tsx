import type { GeneratedImage } from '../../../../domain/generationTask';
import { useI18n } from '../../../../i18n';
import { useOptimizedImageSrc } from '../../../../shared/image';
import { cx } from '../../model/detailHelpers';
import styles from './DetailHeroSection.module.css';

export function DetailThumb({ item, active, onClick }: { item: GeneratedImage; active: boolean; onClick: () => void }) {
  const { t } = useI18n();
  const thumbnailSrc = useOptimizedImageSrc(item.thumbnailSrc ?? item.src, 180);
  return (
    <button type="button" className={cx(styles.thumb, active && styles.active)} onClick={onClick}>
      <img src={thumbnailSrc} alt={t('detail.outputAlt', { index: item.index + 1 })} loading="lazy" decoding="async" />
    </button>
  );
}
