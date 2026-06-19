import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'detail.loadComposer',
  label: 'Load request to composer',
  Component: lazyElementComponent(() => import('./LoadComposerAction'), 'LoadComposerAction'),
  enabled: (context) => !context.isBatchSnapshot && Boolean(context.onRestoreRequest)
} satisfies ElementDefinition<DetailActionContext>;
