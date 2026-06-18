import type { ElementDefinition } from '../../../../interface/registry/types';
import type { GalleryCardActionContext } from '../../../../interface/context/workspace/gallery';
import { DeleteGalleryTaskAction } from './DeleteGalleryTaskAction';

export default {
  id: 'gallery.deleteTask',
  label: 'Delete gallery task',
  Component: DeleteGalleryTaskAction
} satisfies ElementDefinition<GalleryCardActionContext>;
