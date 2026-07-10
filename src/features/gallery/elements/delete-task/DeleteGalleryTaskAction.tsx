import { useState, type MouseEvent } from 'react';
import { useI18n } from '../../../../i18n';
import { Button, ConfirmationDialog } from '../../../../shared/ui';
import { GalleryDeleteButton } from '../shared/GallerySlotElements';
import type { GalleryCardActionContext } from '../../../../interface/context/workspace/gallery';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

type DeleteGalleryTaskActionProps = {
  presentation?: 'icon' | 'menuItem';
  labelKey?: string;
  fullWidth?: boolean;
};

export function DeleteGalleryTaskAction({ context, props }: ElementDefinitionProps<GalleryCardActionContext, DeleteGalleryTaskActionProps>) {
  const { t } = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const label = t(props.labelKey ?? 'gallery.deleteRequest');
  const handleDelete = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setConfirmOpen(true);
  };

  const trigger = props.presentation === 'menuItem' ? (
    <Button variant="ghost" size="compact" tone="danger" fullWidth={Boolean(props.fullWidth)} data-gallery-action="delete" onClick={handleDelete}>
      {label}
    </Button>
  ) : (
    <GalleryDeleteButton onClick={handleDelete} ariaLabel={label} />
  );

  return (
    <>
      {trigger}
      <ConfirmationDialog
        open={confirmOpen}
        title={t('gallery.taskDeleteTitle')}
        description={t('gallery.taskDeleteConfirm')}
        confirmLabel={t('gallery.confirmDeleteAction')}
        cancelLabel={t('gallery.confirmDeleteCancel')}
        closeLabel={t('attachment.close')}
        tone="danger"
        testId="gallery-delete-task-dialog"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          context.onDeleteTask();
        }}
      >
        <p>{t('gallery.deletePermanentHint')}</p>
      </ConfirmationDialog>
    </>
  );
}
