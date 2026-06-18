import type { ChangeEvent } from 'react';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import { SlotHost } from '../../../../interface/SlotHost';
import type { GalleryHeaderActionContext, GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import type { GalleryKindFilter, GallerySortMode, GalleryStatusFilter } from '../../../../entities/gallery/archiveTypes';
import { useI18n } from '../../../../i18n';
import styles from './GalleryHeaderSection.module.css';

function GalleryArchiveControls({ context }: { context: GalleryLayoutContext }) {
  const { t } = useI18n();
  const { archive } = context;
  if (archive.totalCount === 0) return null;

  const updateQuery = (event: ChangeEvent<HTMLInputElement>) => archive.setQuery(event.target.value);
  const updateStatus = (event: ChangeEvent<HTMLSelectElement>) => archive.setStatusFilter(event.target.value as GalleryStatusFilter);
  const updateKind = (event: ChangeEvent<HTMLSelectElement>) => archive.setKindFilter(event.target.value as GalleryKindFilter);
  const updateSort = (event: ChangeEvent<HTMLSelectElement>) => archive.setSort(event.target.value as GallerySortMode);
  const deleteFiltered = () => {
    if (!window.confirm(t('gallery.deleteFilteredConfirm', { count: archive.filteredCount }))) return;
    archive.deleteFiltered();
  };

  return (
    <div className={styles.archiveControls} data-gallery-slot="archive-controls">
      <label className={styles.searchField}>
        <span>{t('gallery.search')}</span>
        <input
          value={archive.query}
          onChange={updateQuery}
          placeholder={t('gallery.searchPlaceholder')}
          aria-label={t('gallery.search')}
        />
      </label>
      <label className={styles.controlField}>
        <span>{t('gallery.statusFilter')}</span>
        <select value={archive.statusFilter} onChange={updateStatus} aria-label={t('gallery.statusFilter')}>
          <option value="all">{t('gallery.filter.all')}</option>
          <option value="active">{t('gallery.filter.active')}</option>
          <option value="terminal">{t('gallery.filter.terminal')}</option>
          <option value="succeeded">{t('status.succeeded')}</option>
          <option value="failed">{t('status.failed')}</option>
          <option value="cancelled">{t('status.cancelled')}</option>
        </select>
      </label>
      <label className={styles.controlField}>
        <span>{t('gallery.kindFilter')}</span>
        <select value={archive.kindFilter} onChange={updateKind} aria-label={t('gallery.kindFilter')}>
          <option value="all">{t('gallery.filter.all')}</option>
          <option value="single">{t('gallery.kind.single')}</option>
          <option value="batch">{t('gallery.kind.batchShort')}</option>
        </select>
      </label>
      <label className={styles.controlField}>
        <span>{t('gallery.sort')}</span>
        <select value={archive.sort} onChange={updateSort} aria-label={t('gallery.sort')}>
          <option value="newest">{t('gallery.sort.newest')}</option>
          <option value="oldest">{t('gallery.sort.oldest')}</option>
          <option value="updated">{t('gallery.sort.updated')}</option>
          <option value="images">{t('gallery.sort.images')}</option>
        </select>
      </label>
      {archive.hasFilters && (
        <button type="button" className={styles.resetFiltersButton} onClick={archive.reset}>
          {t('gallery.resetFilters')}
        </button>
      )}
      {archive.hasFilters && archive.filteredCount > 0 && (
        <button type="button" className={`${styles.resetFiltersButton} ${styles.deleteFilteredButton}`} onClick={deleteFiltered}>
          {t('gallery.deleteFiltered')}
        </button>
      )}
    </div>
  );
}

export function GalleryHeaderSection({ context }: ElementDefinitionProps<GalleryLayoutContext>) {
  const { t } = useI18n();
  const hasCards = context.archive.totalCount > 0;

  return (
    <header className={`${styles.header} ${hasCards ? styles.hasResults : ''}`} data-gallery-slot="header">
      <div className={styles.headerTopline}>
        <div className={styles.headerCopy}>
          {hasCards && <h2>{t('gallery.title')}</h2>}
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
