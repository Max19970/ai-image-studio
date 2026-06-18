import type { WorkspaceSidebarContext } from '../../../interface/context/workspace/sidebar';
import type { WorkspaceContextFactoryArgs } from './types';

export function createSidebarContext({ state, commands }: WorkspaceContextFactoryArgs): WorkspaceSidebarContext {
  return {
    collapsed: state.sidebarCollapsed,
    activeTab: state.workspaceTab,
    commands: commands.workspace
  };
}
