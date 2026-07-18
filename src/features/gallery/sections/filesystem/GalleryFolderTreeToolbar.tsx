import { useState, type FormEvent } from 'react';
import type { GalleryFolder } from '../../../../domain/galleryFilesystem';
import type { GalleryLayoutContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import { Button, ConfirmationDialog, FolderPlusIcon } from '../../../../shared/ui';
import { GalleryQuickActionMenu } from '../shared/GalleryQuickActionMenu';
import { GalleryFolderCreatorForm } from './GalleryFolderCreatorForm';
import { GalleryFolderRenameDialog } from './GalleryFolderRenameDialog';
import styles from './GalleryFolderTree.module.css';

interface GalleryFolderTreeToolbarProps {
  context: GalleryLayoutContext;
  activePath: string;
  activeFolder: GalleryFolder | null;
  activeFolderPinned: boolean;
  showTitle: boolean;
  onFolderCreated: () => void;
}

export function GalleryFolderTreeToolbar({
  context,
  activePath,
  activeFolder,
  activeFolderPinned,
  showTitle,
  onFolderCreated
}: GalleryFolderTreeToolbarProps) {
  const { t } = useI18n();
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const closeCreator = () => {
    if (creating) return;
    setCreatorOpen(false);
    setFolderName('');
    setCreateError('');
  };

  const createFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = folderName.trim();
    if (!name || creating) return;
    setCreating(true);
    setCreateError('');
    try {
      await context.commands.createFolderAt(activePath, name);
      setCreatorOpen(false);
      setFolderName('');
      setCreateError('');
      onFolderCreated();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : String(error));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className={`${styles.toolbar} ${showTitle ? '' : styles.toolbarActionsOnly}`}>
        {showTitle && (
          <div className={styles.toolbarCopy}>
            <strong>{t('gallery.folderTreeFolders')}</strong>
            <span>{context.folders.length}</span>
          </div>
        )}
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.toolbarButton} data-testid="gallery-folder-tree-create" onClick={() => setCreatorOpen(true)} aria-label={t('gallery.folderCreate')}>
            <FolderPlusIcon size={19} />
          </button>
          <GalleryQuickActionMenu
            triggerClassName={styles.toolbarButton}
            triggerLabel={t('gallery.currentFolderActionsOpen')}
            menuLabel={t('gallery.currentFolderActions')}
            testId="gallery-folder-tree-actions"
          >
            {({ close }) => (
              <>
                <Button variant="ghost" size="compact" fullWidth role="menuitem" onClick={() => { setCreatorOpen(true); close(); }}>
                  {t('gallery.folderCreate')}
                </Button>
                {activeFolder && (
                  <Button variant="ghost" size="compact" fullWidth role="menuitem" onClick={() => { setRenameOpen(true); close(); }}>
                    {t('gallery.folderRenameAction')}
                  </Button>
                )}
                {activeFolder && (
                  <Button variant="ghost" size="compact" fullWidth role="menuitem" onClick={() => { void context.commands.setPinned('folder', activeFolder.path, !activeFolderPinned); close(); }}>
                    {activeFolderPinned ? t('gallery.actionUnpin') : t('gallery.actionPin')}
                  </Button>
                )}
                {activeFolder && (
                  <Button variant="ghost" tone="danger" size="compact" fullWidth role="menuitem" onClick={() => { setDeleteOpen(true); close(); }}>
                    {t('gallery.folderDelete', { name: activeFolder.name })}
                  </Button>
                )}
              </>
            )}
          </GalleryQuickActionMenu>
        </div>
      </div>

      <div
        className={styles.creatorDisclosure}
        data-open={creatorOpen}
        aria-hidden={!creatorOpen}
        inert={!creatorOpen}
      >
        <div className={styles.creatorWrap}>
          <GalleryFolderCreatorForm
            compact
            autoFocus={creatorOpen}
            name={folderName}
            pending={creating}
            error={createError}
            onNameChange={setFolderName}
            onSubmit={createFolder}
            onCancel={closeCreator}
          />
        </div>
      </div>

      <GalleryFolderRenameDialog
        open={renameOpen && Boolean(activeFolder)}
        currentName={activeFolder?.name ?? ''}
        onClose={() => setRenameOpen(false)}
        onRename={(name) => activeFolder ? context.commands.renameFolder(activeFolder.path, name) : Promise.resolve()}
      />
      <ConfirmationDialog
        open={deleteOpen && Boolean(activeFolder)}
        title={t('gallery.folderDeleteTitle')}
        description={t('gallery.folderDeleteConfirm', { name: activeFolder?.name ?? '' })}
        confirmLabel={t('gallery.confirmDeleteAction')}
        cancelLabel={t('gallery.confirmDeleteCancel')}
        closeLabel={t('attachment.close')}
        tone="danger"
        testId="gallery-delete-tree-folder-dialog"
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          const path = activeFolder?.path;
          setDeleteOpen(false);
          if (path) void context.commands.deleteFolder(path);
        }}
      >
        <p>{t('gallery.deletePermanentHint')}</p>
      </ConfirmationDialog>
    </>
  );
}
