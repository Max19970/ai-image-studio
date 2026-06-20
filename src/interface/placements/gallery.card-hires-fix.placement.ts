import type { ElementPlacement } from '../registry/types';
import type { GalleryCardActionContext } from '../context/workspace/gallery';

export default [
  {
    id: 'gallery.card-menu.upscale',
    slot: 'gallery/card-menu-actions',
    use: 'gallery.hiresFix',
    order: 15,
    enabled: (context) => Boolean(context.activeImage)
  }
] satisfies ElementPlacement<GalleryCardActionContext>[];
