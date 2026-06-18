import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceMainContext } from '../../../../interface/context/workspace/main';
import { WorkspaceSettingsSection } from './WorkspaceSettingsSection';

export default {
  id: 'workspace.settingsPage',
  label: 'Workspace settings page',
  Component: WorkspaceSettingsSection
} satisfies ElementDefinition<WorkspaceMainContext>;
