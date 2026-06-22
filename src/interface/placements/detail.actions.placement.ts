import type { ElementPlacement } from '../registry/types';
import type { DetailActionContext } from '../context/workspace/detail';
import { detailToImageDownload, type ImageDownloadActionContext } from '../context/adapters/imageDownload';

function canRunDetailHiresFix(context: DetailActionContext): boolean {
  const snapshot = context.activeImage?.request ?? context.snapshot;
  return Boolean(context.activeImage?.src && context.activeImage.kind === 'final' && snapshot.providerAdapterId === 'comfyui' && context.onStartHiresFix);
}

export default [
  {
    id: 'detail.actions.load-composer',
    slot: 'detail/actions',
    use: 'detail.loadComposer',
    order: 10,
    enabled: (context: DetailActionContext) => !context.isBatchSnapshot && Boolean(context.onRestoreRequest)
  },
  {
    id: 'detail.actions.hires-fix',
    slot: 'detail/actions',
    use: 'detail.hiresFix',
    order: 15,
    enabled: canRunDetailHiresFix
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
