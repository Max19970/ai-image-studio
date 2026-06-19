import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceModalsContext } from '../../../../interface/context/workspace/composerDock';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'workspace.batchParametersModal',
  label: 'Workspace batch request parameters modal',
  Component: lazyElementComponent(() => import('./WorkspaceBatchParametersModalSection'), 'WorkspaceBatchParametersModalSection'),
  enabled: (context) => Boolean(context.batchParameters.draft)
} satisfies ElementDefinition<WorkspaceModalsContext>;
