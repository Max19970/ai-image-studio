import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import styles from '../../../gallery/ResultsGallery.module.css';

export function GalleryEmptySection({ context }: ElementDefinitionProps<GalleryLayoutContext>) {
  const { t } = useI18n();
  const filteredEmpty = context.archive.totalCount > 0 && context.archive.filteredCount === 0;

  return (
    <div className={styles.empty} data-gallery-slot="empty">
      <div className={styles.emptyFrame} />
      <p className="section-kicker centered">{t('gallery.title')}</p>
      <h3>{filteredEmpty ? t('gallery.noMatchesTitle') : t('gallery.emptyTitle')}</h3>
      <p>{filteredEmpty ? t('gallery.noMatchesText') : t('gallery.emptyText')}</p>
      {filteredEmpty && (
        <button type="button" className={styles.resetFiltersButton} onClick={context.archive.reset}>
          {t('gallery.resetFilters')}
        </button>
      )}
    </div>
  );
}
