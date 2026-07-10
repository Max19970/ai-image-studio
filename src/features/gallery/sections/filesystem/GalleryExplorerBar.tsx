import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { getGalleryBreadcrumbs, getGalleryParentPath, galleryRootPath, normalizeGalleryPath } from '../../../../domain/galleryFilesystem';
import { galleryMetadataKey, galleryPinSet } from '../../../../entities/gallery/galleryMetadata';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import { ConfirmationDialog } from '../../../../shared/ui';
import { PinIcon } from '../shared/PinIcon';
import styles from './GalleryExplorerBar.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

export function GalleryExplorerBar({ context }: { context: GalleryLayoutContext }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false);
  const breadcrumbs = getGalleryBreadcrumbs(context.activePath);
  const canGoUp = context.activePath !== galleryRootPath;
  const pinKeys = useMemo(() => galleryPinSet(context.commands.galleryPins), [context.commands.galleryPins]);
  const pinnedFolders = context.folders.filter((folder) => pinKeys.has(galleryMetadataKey('folder', folder.path))).slice(0, 8);
  const pinnedTasks = context.allTasks.filter((task) => pinKeys.has(galleryMetadataKey('task', task.id))).slice(0, 8);
  const hasPinned = pinnedFolders.length > 0 || pinnedTasks.length > 0;
  const selectedCount = context.selection.selectedItems.length;
  const selectedTaskCount = context.selection.selectedTaskIds.length;
  const clipboardCount = context.selection.clipboard?.items.length ?? 0;
  const activeLabel = breadcrumbs.at(-1)?.label ?? t('gallery.rootFolder');

  const closeCreator = () => {
    setName('');
    setCreatorOpen(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    void context.commands.createFolder(nextName).then(() => {
      setName('');
      setCreatorOpen(false);
      setExplorerOpen(true);
    });
  };

  const deleteSelected = () => {
    if (selectedCount > 0) setDeleteSelectedOpen(true);
  };

  const downloadSelected = () => {
    void context.selection.downloadSelected().catch((error) => {
      window.alert(error instanceof Error ? error.message : String(error));
    });
  };

  return (
    <>
    <div className={cx(styles.explorer, !explorerOpen && styles.collapsed)} data-gallery-slot="filesystem">
      <div className={styles.heroBar}>
        <div className={styles.currentPathBlock}>
          <span className={styles.pathKicker}>{t('gallery.currentPath', { path: context.activePath })}</span>
          <button type="button" className={styles.currentPathButton} onClick={() => setExplorerOpen((value) => !value)} aria-expanded={explorerOpen}>
            <span>{activeLabel}</span>
            <span className={styles.collapseGlyph}>{explorerOpen ? '−' : '+'}</span>
          </button>
        </div>
        <div className={styles.primaryTools}>
          <button
            type="button"
            className={styles.iconAction}
            onClick={() => context.commands.setActivePath(getGalleryParentPath(context.activePath))}
            disabled={!canGoUp}
            aria-label={t('gallery.folderUp')}
          >
            ↑
          </button>
          {context.selection.clipboard && (
            <button type="button" className={styles.primaryAction} onClick={() => void context.selection.pasteToActivePath()}>
              {t('gallery.selectionPaste', { count: clipboardCount })}
            </button>
          )}
          <button type="button" className={styles.iconAction} onClick={() => { setExplorerOpen(true); setCreatorOpen((value) => !value); }} aria-expanded={creatorOpen} aria-label={t('gallery.folderCreate')}>+</button>
          <button type="button" className={cx(styles.iconAction, pinsOpen && styles.iconActionActive)} onClick={() => { setExplorerOpen(true); setPinsOpen((value) => !value); }} disabled={!hasPinned} aria-expanded={pinsOpen} aria-label={t('gallery.pinnedItems')}><PinIcon className={styles.toolIcon} /></button>
        </div>
      </div>

      {explorerOpen && (
        <>
          <nav className={styles.breadcrumbs} aria-label={t('gallery.pathBreadcrumbs')}>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.path} className={styles.separatorWrap}>
                {index > 0 && <span className={styles.separator}>/</span>}
                <button
                  type="button"
                  className={`${styles.crumb} ${crumb.path === context.activePath ? styles.crumbActive : ''}`}
                  onClick={() => context.commands.setActivePath(crumb.path)}
                >
                  {index === 0 ? t('gallery.rootFolder') : crumb.label}
                </button>
              </span>
            ))}
          </nav>

          {creatorOpen && (
            <form className={styles.creatorDock} onSubmit={submit}>
              <input
                className={styles.createInput}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('gallery.folderNamePlaceholder')}
                aria-label={t('gallery.folderName')}
                autoFocus
              />
              <button type="submit" className={styles.createButton} disabled={!name.trim()}>{t('gallery.folderCreate')}</button>
              <button type="button" className={styles.cancelCreateButton} onClick={closeCreator}>{t('gallery.folderCreateCancel')}</button>
            </form>
          )}

          <div className={cx(styles.actionDeck, context.selection.mode && styles.actionDeckActive)}>
            {!context.selection.mode && (
              <>
                <button type="button" className={styles.selectionButton} onClick={context.selection.begin}>{t('gallery.selectionStart')}</button>
                <span className={styles.actionHint}>{context.selection.clipboard ? t('gallery.selectionPaste', { count: clipboardCount }) : t('gallery.selectionMove')}</span>
              </>
            )}
            {context.selection.mode && (
              <>
                <span className={styles.selectedCount} aria-live="polite">{t('gallery.selectionCount', { count: selectedCount })}</span>
                <button type="button" className={styles.selectionButton} onClick={context.selection.selectVisible}>{t('gallery.selectionSelectVisible')}</button>
                <button type="button" className={styles.selectionButton} disabled={selectedCount === 0} onClick={context.selection.clearSelection}>{t('gallery.selectionClear')}</button>
                <button type="button" className={styles.selectionButton} disabled={selectedTaskCount === 0} onClick={downloadSelected}>{t('gallery.selectionDownload', { count: selectedTaskCount })}</button>
                <button type="button" className={styles.selectionButton} disabled={selectedCount === 0} onClick={() => context.selection.copyToClipboard('move')}>{t('gallery.selectionMove')}</button>
                <button type="button" className={styles.selectionButton} disabled={selectedCount === 0} onClick={() => context.selection.copyToClipboard('link-copy')}>{t('gallery.selectionLinkCopy')}</button>
                <button type="button" className={styles.selectionButton} disabled={selectedCount === 0} onClick={() => context.selection.copyToClipboard('deep-copy')}>{t('gallery.selectionDeepCopy')}</button>
                <button type="button" className={styles.selectionButton} disabled={selectedCount === 0} onClick={deleteSelected}>{t('gallery.selectionDelete')}</button>
                <button type="button" className={styles.selectionButton} onClick={context.selection.cancel}>{t('gallery.selectionCancel')}</button>
              </>
            )}
          </div>

          {pinsOpen && hasPinned && (
            <div className={styles.pinnedShelf} aria-label={t('gallery.pinnedItems')}>
              {pinnedFolders.map((folder) => (
                <button key={folder.path} type="button" className={styles.pinnedChip} onClick={() => context.commands.setActivePath(folder.path)}>
                  <PinIcon className={styles.chipIcon} />{folder.name}
                </button>
              ))}
              {pinnedTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className={styles.pinnedChip}
                  onClick={() => {
                    context.commands.setActivePath(normalizeGalleryPath(task.galleryPaths?.[0] ?? task.galleryPath));
                    context.commands.openTaskDetail(task);
                  }}
                >
                  <PinIcon className={styles.chipIcon} />{task.request.prompt || task.request.modelLabel || task.id}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    <ConfirmationDialog
      open={deleteSelectedOpen}
      title={t('gallery.selectionDeleteTitle')}
      description={t('gallery.selectionDeleteConfirm', { count: selectedCount })}
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
    </>
  );
}
