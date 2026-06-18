import { useI18n } from '../../../../i18n';
import { GalleryDeleteButton } from '../shared/GallerySlotElements';
import type { GalleryCardActionContext } from '../../../../interface/context/workspace/gallery';
import type { ElementDefinitionProps } from '../../../../interface/registry/types';

export function DeleteGalleryTaskAction({ context }: ElementDefinitionProps<GalleryCardActionContext>) {
  const { t } = useI18n();
  return (
    <GalleryDeleteButton
      onClick={(event) => { event.stopPropagation(); context.onDeleteTask(); }}
      ariaLabel={t('gallery.deleteRequest')}
    />
  );
}
