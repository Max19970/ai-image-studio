import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { GalleryHeaderActionContext, GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import { GalleryArchiveControls } from './GalleryArchiveControls';
import styles from './GalleryHeaderSection.module.css';

export function GalleryHeaderSection({ context }: ElementDefinitionProps<GalleryLayoutContext>) {
  const { t } = useI18n();
  const hasCards = context.archive.totalCount > 0;

  return (
    <header className={`${styles.header} ${hasCards ? styles.hasResults : ''}`} data-gallery-slot="header">
      <div className={styles.headerTopline}>
        <div className={styles.headerCopy}>
          {hasCards && (
            <div className={styles.titleRow}>
              <h2>{t('gallery.title')}</h2>
              <span className={styles.titleCount}>
                {t('gallery.titleCount', { count: context.archive.filteredCount })}
              </span>
            </div>
          )}
          {hasCards && (
            <p className={styles.archiveSummary}>
              {t('gallery.archiveSummary', {
                visible: context.archive.visibleCount,
                filtered: context.archive.filteredCount,
                total: context.archive.totalCount,
                images: context.archive.filteredImages
              })}
            </p>
          )}
        </div>
        <SlotHost<GalleryHeaderActionContext>
          slot="gallery/header-actions"
          context={context}
          className={styles.headerActions}
        />
      </div>
      <GalleryArchiveControls context={context} />
    </header>
  );
}
