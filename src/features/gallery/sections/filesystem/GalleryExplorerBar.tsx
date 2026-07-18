import { useState } from 'react';
import { getGalleryBreadcrumbs, getGalleryParentPath, galleryRootPath } from '../../../../domain/galleryFilesystem';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery';
import { BottomSheet, ChevronLeftIcon, CircleCheckIcon, ConfirmationDialog, FoldersIcon, ListFilterIcon } from '../../../../shared/ui';
import { GalleryDestinationPicker } from './GalleryDestinationPicker';
import { GalleryFolderTree } from './GalleryFolderTree';
import { GallerySelectionToolbar } from './GallerySelectionToolbar';
import styles from './GalleryExplorerBar.module.css';

interface GalleryExplorerBarProps {
  context: GalleryLayoutContext;
  treeVisible: boolean;
  archiveControlsOpen: boolean;
  onToggleTree: () => void;
  onToggleArchiveControls: () => void;
}

export function GalleryExplorerBar({
  context,
  treeVisible,
  archiveControlsOpen,
  onToggleTree,
  onToggleArchiveControls
}: GalleryExplorerBarProps) {
  const { t } = useI18n();
  const isMobile = useMediaQuery('(max-width: 860px)');
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const breadcrumbs = getGalleryBreadcrumbs(context.activePath);
  const activeCrumb = breadcrumbs.at(-1) ?? breadcrumbs[0];
  const canSelect = context.items.length > 0;
  const canSearch = context.archive.totalCount > 0;
  const selectionMode = context.selection.mode;
  const visibleBreadcrumbs = breadcrumbs.length <= 4
    ? breadcrumbs
    : [breadcrumbs[0], null, ...breadcrumbs.slice(-2)];

  const openNavigator = () => {
    if (isMobile) setNavigatorOpen(true);
    else onToggleTree();
  };

  return (
    <>
      <div className={styles.modeSwitch} data-selection-mode={selectionMode}>
        <div className={`${styles.modeLayer} ${styles.pathMode}`} aria-hidden={selectionMode} inert={selectionMode}>
          <div className={styles.explorer} data-gallery-slot="filesystem">
            <div className={styles.pathBar}>
              <button
                type="button"
                className={styles.treeToggle}
                data-testid="gallery-folder-navigator-toggle"
                onClick={openNavigator}
                aria-label={isMobile ? t('gallery.folderNavigatorOpen') : treeVisible ? t('gallery.folderTreeHide') : t('gallery.folderTreeShow')}
                aria-expanded={isMobile ? navigatorOpen : treeVisible}
              >
                <FoldersIcon size={19} />
              </button>

              {isMobile && context.activePath !== galleryRootPath && (
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => context.commands.setActivePath(getGalleryParentPath(context.activePath))}
                  aria-label={t('gallery.folderUp')}
                >
                  <ChevronLeftIcon size={19} />
                </button>
              )}

              <nav className={styles.breadcrumbs} aria-label={t('gallery.pathBreadcrumbs')}>
                {isMobile ? (
                  <button type="button" className={styles.mobileTitle} onClick={() => setNavigatorOpen(true)}>
                    <span>{activeCrumb.label === 'Gallery' ? t('gallery.rootFolder') : activeCrumb.label}</span>
                    <small>{context.archive.filteredCount}</small>
                  </button>
                ) : visibleBreadcrumbs.map((crumb, index) => crumb ? (
                  <span key={crumb.path} className={styles.crumbWrap}>
                    {index > 0 && <span className={styles.separator}>/</span>}
                    <button
                      type="button"
                      className={styles.crumb}
                      data-active={crumb.path === context.activePath}
                      aria-current={crumb.path === context.activePath ? 'page' : undefined}
                      onClick={() => context.commands.setActivePath(crumb.path)}
                    >
                      {crumb.path === galleryRootPath ? t('gallery.rootFolder') : crumb.label}
                    </button>
                  </span>
                ) : (
                  <span key="ellipsis" className={styles.ellipsis} aria-hidden="true">…</span>
                ))}
              </nav>

              <div className={styles.pathUtilities}>
                {canSearch && (
                  <button
                    type="button"
                    className={styles.archiveControlsToggle}
                    data-testid="gallery-archive-controls-toggle"
                    data-active={context.archive.hasFilters}
                    onClick={onToggleArchiveControls}
                    aria-label={archiveControlsOpen ? t('gallery.archiveControlsHide') : t('gallery.archiveControlsShow')}
                    aria-expanded={archiveControlsOpen}
                  >
                    <ListFilterIcon size={19} />
                  </button>
                )}
                {canSelect && (
                  <button type="button" className={styles.selectionTrigger} data-testid="gallery-selection-start" onClick={context.selection.begin} aria-label={t('gallery.selectionStart')}>
                    <CircleCheckIcon size={19} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`${styles.modeLayer} ${styles.selectionMode}`} aria-hidden={!selectionMode} inert={!selectionMode}>
          <GallerySelectionToolbar context={context} onDelete={() => setDeleteSelectedOpen(true)} />
        </div>
      </div>

      <ConfirmationDialog
        open={deleteSelectedOpen}
        title={t('gallery.selectionDeleteTitle')}
        description={t('gallery.selectionDeleteConfirm', { count: context.selection.selectedItems.length })}
        confirmLabel={t('gallery.confirmDeleteAction')}
        cancelLabel={t('gallery.confirmDeleteCancel')}
        closeLabel={t('attachment.close')}
        tone="danger"
        testId="gallery-delete-selected-dialog"
        onClose={() => setDeleteSelectedOpen(false)}
        onConfirm={() => {
          setDeleteSelectedOpen(false);
          context.selection.deleteSelected();
        }}
      >
        <p>{t('gallery.deletePermanentHint')}</p>
      </ConfirmationDialog>

      <GalleryDestinationPicker context={context} />

      <BottomSheet
        open={navigatorOpen}
        onClose={() => setNavigatorOpen(false)}
        title={t('gallery.folderNavigatorTitle')}
        closeLabel={t('attachment.close')}
        size="full"
        ariaLabel={t('gallery.folderNavigatorTitle')}
        className={styles.navigatorSheet}
      >
        <GalleryFolderTree context={context} compact showToolbarTitle={false} onNavigate={() => setNavigatorOpen(false)} />
      </BottomSheet>
    </>
  );
}
