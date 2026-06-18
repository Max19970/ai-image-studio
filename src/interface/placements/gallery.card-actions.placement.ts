import type { ElementPlacement } from '../registry/types';
import type { GalleryCardActionContext } from '../context/workspace/gallery';

export default [
  {
    id: 'gallery.card.delete-task',
    slot: 'gallery/card-actions',
    use: 'gallery.deleteTask',
    order: 10,
    requiresFeature: 'galleryDelete'
  }
] satisfies ElementPlacement<GalleryCardActionContext>[];
