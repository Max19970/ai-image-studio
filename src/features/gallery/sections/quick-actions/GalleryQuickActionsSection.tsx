import { useState } from 'react';
import { isTerminalGenerationStatus } from '../../../../domain/generationStatus';
import { Button } from '../../../../shared/ui';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';
import type { GalleryCardActionContext } from '../../../../interface/context/workspace/gallery';
import { SlotHost } from '../../../../interface/SlotHost';
import { useI18n } from '../../../../i18n';
import { GalleryQuickActionMenu } from '../shared/GalleryQuickActionMenu';
import { GalleryTagEditorModal } from '../tags/GalleryTagEditorModal';
import styles from './GalleryQuickActionsSection.module.css';

function GalleryActionList({ context, close, onEditTags }: { context: GalleryCardActionContext; close: () => void; onEditTags: () => void }) {
  const { t } = useI18n();

  const openDetails = () => {
    context.onOpenTask(context.activeImage ?? undefined);
    close();
  };

  const cancelTask = () => {
    void context.onCancelTask();
    close();
  };

  const setPinned = () => {
    context.onSetPinned();
    close();
  };

  return (
    <>
      <Button variant="ghost" size="compact" fullWidth className={styles.actionItem} role="menuitem" onClick={openDetails}>
        {t('gallery.actionOpenDetails')}
      </Button>
      {!isTerminalGenerationStatus(context.task.status) && (
        <Button variant="ghost" size="compact" fullWidth className={styles.actionItem} role="menuitem" onClick={cancelTask}>
          {t('gallery.actionCancel')}
        </Button>
      )}
      <Button variant="ghost" size="compact" fullWidth className={styles.actionItem} role="menuitem" onClick={setPinned}>
        {context.pinned ? t('gallery.actionUnpin') : t('gallery.actionPin')}
      </Button>
      <Button variant="ghost" size="compact" fullWidth className={styles.actionItem} role="menuitem" onClick={onEditTags}>
        {t('gallery.actionTags')}{context.tags.length > 0 ? ` · ${context.tags.length}` : ''}
      </Button>
      <SlotHost<GalleryCardActionContext> slot="gallery/card-menu-actions" context={context} as={null} />
    </>
  );
}

export function GalleryQuickActionsSection({ context }: ElementDefinitionProps<GalleryCardActionContext>) {
  const { t } = useI18n();
  const [tagEditorOpen, setTagEditorOpen] = useState(false);

  return (
    <>
      <GalleryQuickActionMenu>
        {({ close }) => (
          <GalleryActionList
            context={context}
            close={close}
            onEditTags={() => {
              close();
              window.setTimeout(() => setTagEditorOpen(true), 0);
            }}
          />
        )}
      </GalleryQuickActionMenu>
      <GalleryTagEditorModal
        open={tagEditorOpen}
        title={t('gallery.tagsModalTitle')}
        tags={context.tags}
        onClose={() => setTagEditorOpen(false)}
        onSave={context.onSetTags}
      />
    </>
  );
}
