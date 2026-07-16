import { useEffect, useMemo, useState } from 'react';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import type { GalleryKindFilter, GallerySortMode, GalleryStatusFilter } from '../../../../entities/gallery/archiveTypes';
import { BottomSheet, Button, ConfirmationDialog, PopoverSelect, type PopoverSelectOption } from '../../../../shared/ui';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { useI18n } from '../../../../i18n';
import styles from './GalleryArchiveControls.module.css';

function GalleryControlSelect({
  label,
  value,
  options,
  compact = false,
  onChange
}: {
  label: string;
  value: string;
  options: PopoverSelectOption[];
  compact?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`${styles.controlField} ${compact ? styles.compactControlField : ''}`}>
      <span>{label}</span>
      <PopoverSelect
        value={value}
        options={options}
        onChange={onChange}
        ariaLabel={label}
        triggerClassName={styles.controlSelectTrigger}
        panelClassName={styles.controlSelectPanel}
        minWidth={compact ? 160 : 180}
      />
    </label>
  );
}

function useGalleryFilterOptions(context: GalleryLayoutContext) {
  const { t } = useI18n();
  const { archive } = context;

  const statusOptions = useMemo<PopoverSelectOption[]>(() => [
    { value: 'all', label: t('gallery.filter.all') },
    { value: 'active', label: t('gallery.filter.active') },
    { value: 'terminal', label: t('gallery.filter.terminal') },
    { value: 'succeeded', label: t('status.succeeded') },
    { value: 'failed', label: t('status.failed') },
    { value: 'cancelled', label: t('status.cancelled') }
  ], [t]);

  const kindOptions = useMemo<PopoverSelectOption[]>(() => [
    { value: 'all', label: t('gallery.filter.all') },
    { value: 'single', label: t('gallery.kind.single') },
    { value: 'batch', label: t('gallery.kind.batchShort') }
  ], [t]);

  const sortOptions = useMemo<PopoverSelectOption[]>(() => [
    { value: 'newest', label: t('gallery.sort.newest') },
    { value: 'oldest', label: t('gallery.sort.oldest') },
    { value: 'updated', label: t('gallery.sort.updated') },
    { value: 'images', label: t('gallery.sort.images') }
  ], [t]);

  const tagOptions = useMemo<PopoverSelectOption[]>(() => [
    { value: '', label: t('gallery.filter.all') },
    ...archive.availableTags.map((tag) => ({ value: tag, label: `#${tag}` }))
  ], [archive.availableTags, t]);

  return { statusOptions, kindOptions, sortOptions, tagOptions };
}

function GalleryFilterSelects({ context, includeSort = false }: { context: GalleryLayoutContext; includeSort?: boolean }) {
  const { t } = useI18n();
  const { archive } = context;
  const { statusOptions, kindOptions, sortOptions, tagOptions } = useGalleryFilterOptions(context);

  return (
    <>
      <GalleryControlSelect
        label={t('gallery.statusFilter')}
        value={archive.statusFilter}
        options={statusOptions}
        onChange={(value) => archive.setStatusFilter(value as GalleryStatusFilter)}
      />
      <GalleryControlSelect
        label={t('gallery.kindFilter')}
        value={archive.kindFilter}
        options={kindOptions}
        onChange={(value) => archive.setKindFilter(value as GalleryKindFilter)}
      />
      <GalleryControlSelect
        label={t('gallery.tagFilter')}
        value={archive.tagFilter}
        options={tagOptions}
        onChange={archive.setTagFilter}
      />
      {includeSort && (
        <GalleryControlSelect
          label={t('gallery.sort')}
          value={archive.sort}
          options={sortOptions}
          onChange={(value) => archive.setSort(value as GallerySortMode)}
        />
      )}
    </>
  );
}

function GallerySortControl({ context }: { context: GalleryLayoutContext }) {
  const { t } = useI18n();
  const { archive } = context;
  const { sortOptions } = useGalleryFilterOptions(context);
  return (
    <GalleryControlSelect
      compact
      label={t('gallery.sort')}
      value={archive.sort}
      options={sortOptions}
      onChange={(value) => archive.setSort(value as GallerySortMode)}
    />
  );
}

function GalleryFilterTokens({ context, onDeleteFiltered }: { context: GalleryLayoutContext; onDeleteFiltered: () => void }) {
  const { t } = useI18n();
  const { archive } = context;
  if (!archive.hasFilters) return null;

  const tokens = [
    archive.query ? t('gallery.token.query', { query: archive.query }) : null,
    archive.statusFilter !== 'all' ? t('gallery.token.status', { value: t(archive.statusFilter === 'active' || archive.statusFilter === 'terminal' ? `gallery.filter.${archive.statusFilter}` : `status.${archive.statusFilter}`) }) : null,
    archive.kindFilter !== 'all' ? t('gallery.token.kind', { value: t(archive.kindFilter === 'batch' ? 'gallery.kind.batchShort' : 'gallery.kind.single') }) : null,
    archive.tagFilter ? t('gallery.token.tag', { tag: archive.tagFilter }) : null
  ].filter((token): token is string => Boolean(token));

  return (
    <div className={styles.filterTokens} aria-label={t('gallery.activeFilters')}>
      {tokens.map((token) => <span key={token} className={styles.filterToken}>{token}</span>)}
      <button type="button" className={styles.filterTokenButton} onClick={archive.reset}>{t('gallery.resetFilters')}</button>
      {archive.filteredTaskCount > 0 && <button type="button" className={`${styles.filterTokenButton} ${styles.deleteFilteredButton}`} onClick={onDeleteFiltered}>{t('gallery.deleteFiltered')}</button>}
    </div>
  );
}

export function GalleryArchiveControls({ context, open }: { context: GalleryLayoutContext; open: boolean }) {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 860px)');
  const { archive } = context;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteFilteredOpen, setDeleteFilteredOpen] = useState(false);

  useEffect(() => {
    if (!open) setFiltersOpen(false);
  }, [open]);

  if (archive.totalCount === 0) return null;

  const activeFilterCount = [archive.statusFilter !== 'all', archive.kindFilter !== 'all', Boolean(archive.tagFilter)].filter(Boolean).length;

  return (
    <>
      <section
        className={styles.controlsDisclosure}
        data-open={open}
        aria-hidden={!open}
        inert={!open}
      >
        <div className={styles.controlsClip}>
          <div className={styles.controls} data-gallery-slot="archive-controls">
            <div className={styles.toolbar}>
              <label className={styles.searchField}>
                <span className={styles.visuallyHidden}>{t('gallery.search')}</span>
                <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.75" cy="8.75" r="5.25" /><path d="m12.75 12.75 3.5 3.5" /></svg>
                <input
                  data-testid="gallery-search-input"
                  value={archive.query}
                  onChange={(event) => archive.setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Escape' || !archive.query) return;
                    event.preventDefault();
                    archive.setQuery('');
                  }}
                  placeholder={t('gallery.searchPlaceholder')}
                  aria-label={t('gallery.search')}
                />
              </label>
              <div className={styles.toolbarActions}>
                {!isMobile && <GallerySortControl context={context} />}
                <Button
                  variant="ghost"
                  size="compact"
                  className={styles.filtersButton}
                  data-testid="gallery-filters-toggle"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((current) => !current)}
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 5.25h13M6 10h8M8.25 14.75h3.5" /></svg>
                  <span>{t('gallery.filters')}</span>
                  {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
                </Button>
              </div>
            </div>

            {!isMobile && (
              <div
                className={styles.desktopFilterDisclosure}
                data-open={filtersOpen}
                aria-hidden={!filtersOpen}
                inert={!filtersOpen}
              >
                <div className={styles.desktopFilterClip}>
                  <div className={styles.desktopFilterPanel} data-testid="gallery-filter-panel">
                    <GalleryFilterSelects context={context} />
                  </div>
                </div>
              </div>
            )}

            <GalleryFilterTokens context={context} onDeleteFiltered={() => setDeleteFilteredOpen(true)} />
          </div>
        </div>
      </section>

      <BottomSheet
        open={isMobile && open && filtersOpen}
        title={t('gallery.filters')}
        description={t('gallery.filtersDescription')}
        closeLabel={t('attachment.close')}
        size="content"
        onClose={() => setFiltersOpen(false)}
        footer={<><Button variant="ghost" size="compact" onClick={archive.reset} disabled={!archive.hasFilters}>{t('gallery.resetFilters')}</Button><Button variant="primary" size="compact" onClick={() => setFiltersOpen(false)}>{t('gallery.applyFilters')}</Button></>}
      >
        <div className={styles.mobileFilterSheet} data-testid="gallery-filter-panel"><GalleryFilterSelects context={context} includeSort /></div>
      </BottomSheet>

      <ConfirmationDialog
        open={deleteFilteredOpen}
        title={t('gallery.deleteFilteredTitle')}
        description={t('gallery.deleteFilteredConfirm', { count: archive.filteredTaskCount })}
        confirmLabel={t('gallery.confirmDeleteAction')}
        cancelLabel={t('gallery.confirmDeleteCancel')}
        closeLabel={t('attachment.close')}
        tone="danger"
        testId="gallery-delete-filtered-dialog"
        onClose={() => setDeleteFilteredOpen(false)}
        onConfirm={() => {
          setDeleteFilteredOpen(false);
          archive.deleteFiltered();
        }}
      >
        <p>{t('gallery.deletePermanentHint')}</p>
      </ConfirmationDialog>
    </>
  );
}
