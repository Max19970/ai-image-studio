import type { ElementDefinition } from '../../../../interface/registry/types';
import type { DetailActionContext } from '../../../../interface/context/workspace/detail';
import { LoadComposerAction } from './LoadComposerAction';

export default {
  id: 'detail.loadComposer',
  label: 'Load request to composer',
  Component: LoadComposerAction,
  enabled: (context) => !context.isBatchSnapshot && Boolean(context.onRestoreRequest)
} satisfies ElementDefinition<DetailActionContext>;
