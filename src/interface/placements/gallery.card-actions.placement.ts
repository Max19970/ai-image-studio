import type { ElementPlacement } from '../registry/types';
import type { GalleryCardActionContext } from '../context/workspace/gallery';

export default [
  {
    id: 'gallery.card-menu.delete-task',
    slot: 'gallery/card-menu-actions',
    use: 'gallery.deleteTask',
    order: 20,
    props: {
      presentation: 'menuItem',
      labelKey: 'gallery.actionDelete',
      fullWidth: true
    },
    requiresFeature: 'galleryDelete'
  }
] satisfies ElementPlacement<GalleryCardActionContext>[];
