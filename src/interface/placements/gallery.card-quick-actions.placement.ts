import type { ElementPlacement } from '../registry/types';
import type { GalleryCardActionContext } from '../context/workspace/gallery';

export default [
  {
    id: 'gallery.card.quick-actions',
    slot: 'gallery/card-quick-actions',
    use: 'gallery.sections.quickActions',
    order: 10
  }
] satisfies ElementPlacement<GalleryCardActionContext>[];
