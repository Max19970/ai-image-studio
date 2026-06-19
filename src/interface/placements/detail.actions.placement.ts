import type { ElementPlacement } from '../registry/types';
import type { DetailActionContext } from '../context/workspace/detail';
import { detailToImageDownload, type ImageDownloadActionContext } from '../context/adapters/imageDownload';

export default [
  {
    id: 'detail.actions.load-composer',
    slot: 'detail/actions',
    use: 'detail.loadComposer',
    order: 10,
    enabled: (context: DetailActionContext) => !context.isBatchSnapshot && Boolean(context.onRestoreRequest)
  },
  {
    id: 'detail.actions.download-image',
    slot: 'detail/actions',
    use: 'imageActions.downloadImage',
    order: 20,
    props: {
      labelKey: 'detail.download',
      presentation: 'button',
      variant: 'secondary'
    },
    enabled: (context) => Boolean(context.activeImage),
    adaptContext: detailToImageDownload
  } satisfies ElementPlacement<DetailActionContext, ImageDownloadActionContext>,
  {
    id: 'detail.actions.copy-menu',
    slot: 'detail/actions',
    use: 'detail.copyMenu',
    order: 30
  }
] satisfies ElementPlacement<any, any>[];
