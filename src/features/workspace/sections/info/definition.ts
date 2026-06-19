import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'workspace.infoPage',
  label: 'Workspace info page',
  Component: lazyElementComponent(() => import('./WorkspaceInfoSection'), 'WorkspaceInfoSection')
} satisfies ElementDefinition<WorkspaceMainContext>;
