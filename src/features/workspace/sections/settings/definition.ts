import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';
import { lazyElementComponent } from '../../../../interface/registry/lazyElement';

export default {
  id: 'workspace.settingsPage',
  label: 'Workspace settings page',
  Component: lazyElementComponent(() => import('./WorkspaceSettingsSection'), 'WorkspaceSettingsSection')
} satisfies ElementDefinition<WorkspaceMainContext>;
