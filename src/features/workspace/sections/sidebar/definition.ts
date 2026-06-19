import type { ElementDefinition } from '../../../../interface/registry/types';
import type { WorkspaceSidebarContext } from '../../../../interface/context/workspace/sidebar';
import { WorkspaceSidebarSection } from './WorkspaceSidebarSection';

export default {
  id: 'workspace.sidebar',
  label: 'Workspace navigation shell',
  Component: WorkspaceSidebarSection
} satisfies ElementDefinition<WorkspaceSidebarContext>;
