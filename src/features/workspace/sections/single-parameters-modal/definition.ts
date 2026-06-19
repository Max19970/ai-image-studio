import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceModalsContext } from '../../../../interface/context/workspace/composerDock';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'workspace.singleParametersModal',
  label: 'Workspace single request parameters modal',
  Component: lazyElementComponent(() => import('./WorkspaceSingleParametersModalSection'), 'WorkspaceSingleParametersModalSection')
} satisfies ElementDefinition<WorkspaceModalsContext>;
