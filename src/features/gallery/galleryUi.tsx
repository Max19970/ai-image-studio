import type { GenerationTask } from '../../domain/generationTask';
import { useI18n } from '../../i18n';
import { statusToUiTone } from '../../domain/generationStatus';
import styles from './ResultsGallery.module.css';

export const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export function useGalleryStatusLabel(status: GenerationTask['status']) {
  const { t } = useI18n();
  return t(`status.${status}`);
}

export function GalleryStatusPill({ status, floating = false, children }: { status: GenerationTask['status']; floating?: boolean; children: string }) {
  const tone = statusToUiTone(status);
  return <span className={cx(styles.statusPill, floating && styles.floatingPill, styles[tone], styles[status])}>{children}</span>;
}
