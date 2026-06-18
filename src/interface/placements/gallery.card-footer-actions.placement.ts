import type { ElementPlacement } from '../registry/types';
import type { GalleryCardActionContext } from '../context/workspace/gallery';
import { galleryCardToImageDownload, type ImageDownloadActionContext } from '../context/adapters/imageDownload';

export default [
  {
    id: 'gallery.card-footer.download-image',
    slot: 'gallery/card-footer-actions',
    use: 'imageActions.downloadImage',
    order: 10,
    props: {
      labelKey: 'gallery.download',
      presentation: 'link'
    },
    enabled: (context) => Boolean(context.activeImage),
    adaptContext: galleryCardToImageDownload
  }
] satisfies ElementPlacement<GalleryCardActionContext, ImageDownloadActionContext>[];
