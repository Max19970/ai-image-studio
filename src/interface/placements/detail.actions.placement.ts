import type { ElementPlacement } from '../registry/types';
import type { DetailActionContext } from '../context/workspace/detail';
import { detailToImageDownload, type ImageDownloadActionContext } from '../context/adapters/imageDownload';

export default [
  {
    id: 'detail.actions.download-image',
    slot: 'detail/actions',
    use: 'imageActions.downloadImage',
    order: 10,
    props: {
      labelKey: 'detail.download',
      presentation: 'button',
      variant: 'primary'
    },
    enabled: (context) => Boolean(context.activeImage),
    adaptContext: detailToImageDownload
  } satisfies ElementPlacement<DetailActionContext, ImageDownloadActionContext>,
  {
    id: 'detail.actions.copy-prompt',
    slot: 'detail/actions',
    use: 'detail.copyPrompt',
    order: 20
  },
  {
    id: 'detail.actions.copy-payload',
    slot: 'detail/actions',
    use: 'detail.copyPayload',
    order: 30
  },
  {
    id: 'detail.actions.copy-params',
    slot: 'detail/actions',
    use: 'detail.copyParams',
    order: 40,
    enabled: (context: DetailActionContext) => !context.isBatchSnapshot
  },
  {
    id: 'detail.actions.load-composer',
    slot: 'detail/actions',
    use: 'detail.loadComposer',
    order: 50,
    enabled: (context: DetailActionContext) => !context.isBatchSnapshot && Boolean(context.onRestoreRequest)
  }
] satisfies ElementPlacement<any, any>[];
