import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'workspace.batchComposerPage',
  label: 'Workspace batch composer page',
  Component: lazyElementComponent(() => import('./WorkspaceBatchComposerSection'), 'WorkspaceBatchComposerSection')
} satisfies ElementDefinition<WorkspaceMainContext>;
