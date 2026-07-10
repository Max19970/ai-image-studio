import { useMemo, useState } from 'react';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import type { GalleryKindFilter, GallerySortMode, GalleryStatusFilter } from '../../../../entities/gallery/archiveTypes';
import { BottomSheet, Button, CommandBar, ConfirmationDialog, PopoverSelect, type PopoverSelectOption } from '../../../../shared/ui';
import { useI18n } from '../../../../i18n';
import styles from './GalleryArchiveControls.module.css';

function GalleryControlSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: PopoverSelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.controlField}>
      <span>{label}</span>
      <PopoverSelect
        value={value}
        options={options}
        onChange={onChange}
        ariaLabel={label}
        triggerClassName={styles.controlSelectTrigger}
        panelClassName={styles.controlSelectPanel}
        minWidth={180}
      />
    </label>
  );
}

function GalleryFilterSelects({ context }: { context: GalleryLayoutContext }) {
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
        onChange={(value) => archive.setTagFilter(value)}
      />
      <GalleryControlSelect
        label={t('gallery.sort')}
        value={archive.sort}
        options={sortOptions}
        onChange={(value) => archive.setSort(value as GallerySortMode)}
      />
    </>
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

export function GalleryArchiveControls({ context }: { context: GalleryLayoutContext }) {
  const { t } = useI18n();
  const { archive } = context;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteFilteredOpen, setDeleteFilteredOpen] = useState(false);
  if (archive.totalCount === 0) return null;

  const deleteFiltered = () => setDeleteFilteredOpen(true);

  return (
    <>
      <CommandBar as="div" density="compact" align="between" className={styles.commandBar} data-gallery-slot="archive-controls">
        <label className={styles.searchField}>
          <span>{t('gallery.search')}</span>
          <input value={archive.query} onChange={(event) => archive.setQuery(event.target.value)} placeholder={t('gallery.searchPlaceholder')} aria-label={t('gallery.search')} />
        </label>
        <div className={styles.desktopFilters}><GalleryFilterSelects context={context} /></div>
        <Button variant="ghost" size="compact" className={styles.mobileFiltersButton} onClick={() => setFiltersOpen(true)}>{t('gallery.filters')}</Button>
      </CommandBar>
      <GalleryFilterTokens context={context} onDeleteFiltered={deleteFiltered} />
      <BottomSheet open={filtersOpen} title={t('gallery.filters')} description={t('gallery.filtersDescription')} closeLabel={t('attachment.close')} size="content" onClose={() => setFiltersOpen(false)} footer={<><Button variant="ghost" size="compact" onClick={archive.reset} disabled={!archive.hasFilters}>{t('gallery.resetFilters')}</Button><Button variant="primary" size="compact" onClick={() => setFiltersOpen(false)}>{t('gallery.applyFilters')}</Button></>}>
        <div className={styles.mobileFilterSheet}><GalleryFilterSelects context={context} /></div>
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
