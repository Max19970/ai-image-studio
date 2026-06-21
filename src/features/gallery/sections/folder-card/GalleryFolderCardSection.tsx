import { useState } from 'react';
import { Button } from '../../../../shared/ui';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { GalleryFolderCardContext } from '../../../../interface/context/workspace/gallery';
import { useI18n } from '../../../../i18n';
import tileStyles from '../shared/GalleryTileSection.module.css';
import { PinIcon } from '../shared/PinIcon';
import { GalleryQuickActionMenu } from '../shared/GalleryQuickActionMenu';
import { GalleryTagEditorModal } from '../tags/GalleryTagEditorModal';
import styles from './GalleryFolderCardSection.module.css';

const cx = (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' ');

function FolderActionMenu({ context, close, openTags }: { context: GalleryFolderCardContext; close: () => void; openTags: () => void }) {
  const { t } = useI18n();

  const deleteFolder = () => {
    close();
    if (!window.confirm(t('gallery.folderDeleteConfirm', { name: context.folder.name }))) return;
    void context.onDeleteFolder();
  };

  const run = (action: () => void) => {
    action();
    close();
  };

  return (
    <>
      <Button variant="ghost" size="compact" fullWidth className={styles.actionItem} role="menuitem" onClick={() => run(context.onOpenFolder)}>
        {t('gallery.folderOpen', { name: context.folder.name })}
      </Button>
      <Button variant="ghost" size="compact" fullWidth className={styles.actionItem} role="menuitem" onClick={() => run(context.onSetPinned)}>
        {context.folder.pinned ? t('gallery.actionUnpin') : t('gallery.actionPin')}
      </Button>
      <Button variant="ghost" size="compact" fullWidth className={styles.actionItem} role="menuitem" onClick={openTags}>
        {t('gallery.actionTags')}{context.folder.tags.length > 0 ? ` · ${context.folder.tags.length}` : ''}
      </Button>
      <Button variant="ghost" size="compact" tone="danger" fullWidth className={styles.actionItem} role="menuitem" onClick={deleteFolder}>
        {t('gallery.folderDelete', { name: context.folder.name })}
      </Button>
    </>
  );
}

export function GalleryFolderCardSection({ context }: ElementDefinitionProps<GalleryFolderCardContext>) {
  const { t } = useI18n();
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const childCount = context.folder.childFolderCount + context.folder.childTaskCount;

  return (
    <>
      <article className={cx(tileStyles.tile, styles.folderCard)} data-gallery-slot="folder-tile">
        <button
          type="button"
          className={styles.folderFace}
          onClick={context.onOpenFolder}
          aria-label={t('gallery.folderOpen', { name: context.folder.name })}
        >
          <span className={styles.folderGlyph} aria-hidden="true" />
          <span className={styles.folderCopy}>
            <strong>{context.folder.name}</strong>
            <span>{t('gallery.folderChildCount', { count: childCount })}</span>
          </span>
        </button>
        <div className={styles.folderActions}>
          <GalleryQuickActionMenu triggerClassName={styles.folderActionTrigger}>
            {({ close }) => (
              <FolderActionMenu
                context={context}
                close={close}
                openTags={() => {
                  close();
                  window.setTimeout(() => setTagEditorOpen(true), 0);
                }}
              />
            )}
          </GalleryQuickActionMenu>
        </div>
        {context.folder.pinned && <span className={styles.pinMark} aria-hidden="true"><PinIcon className={styles.pinIcon} /></span>}
      </article>
      <GalleryTagEditorModal
        open={tagEditorOpen}
        title={t('gallery.tagsModalTitle')}
        tags={context.folder.tags}
        onClose={() => setTagEditorOpen(false)}
        onSave={context.onSetTags}
      />
    </>
  );
}
