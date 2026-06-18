import type { WorkspaceCommands } from '../../interface/context/commands';
import type { CreateAppCommandsArgs } from './appCommandTypes';

export function createWorkspaceCommands(args: CreateAppCommandsArgs): WorkspaceCommands {
  return {
    setTab: args.setWorkspaceTab,
    setSidebarCollapsed: args.setSidebarCollapsed
  };
}
