import type { ElementPlacement } from '../registry/types';
import type { GalleryCardActionContext } from '../context/workspace/gallery';
import { galleryCardToImageDownload, type ImageDownloadActionContext } from '../context/adapters/imageDownload';

export default [
  {
    id: 'gallery.card-menu.download-image',
    slot: 'gallery/card-menu-actions',
    use: 'imageActions.downloadImage',
    order: 10,
    props: {
      labelKey: 'gallery.actionDownload',
      presentation: 'button',
      variant: 'ghost',
      size: 'compact',
      fullWidth: true
    },
    enabled: (context) => Boolean(context.activeImage),
    adaptContext: galleryCardToImageDownload
  }
] satisfies ElementPlacement<GalleryCardActionContext, ImageDownloadActionContext>[];
