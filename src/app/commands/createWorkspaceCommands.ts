import type { WorkspaceCommands } from '../../interface/context/commands';
import type { WorkspaceCommandDeps } from './appCommandTypes';

export function createWorkspaceCommands(args: WorkspaceCommandDeps): WorkspaceCommands {
  return {
    setTab: args.setWorkspaceTab,
    setSidebarCollapsed: args.setSidebarCollapsed
  };
}
