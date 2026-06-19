import type { MouseEvent } from 'react';
import { useI18n } from '../../../../i18n';
import { Button } from '../../../../shared/ui';
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
  const label = t(props.labelKey ?? 'gallery.deleteRequest');
  const handleDelete = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    context.onDeleteTask();
  };

  if (props.presentation === 'menuItem') {
    return (
      <Button variant="ghost" size="compact" tone="danger" fullWidth={Boolean(props.fullWidth)} data-gallery-action="delete" onClick={handleDelete}>
        {label}
      </Button>
    );
  }

  return (
    <GalleryDeleteButton
      onClick={handleDelete}
      ariaLabel={label}
    />
  );
}
