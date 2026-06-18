import type { WorkspaceCommands } from '../commands';
import type { WorkspaceTab } from './tabs';

export interface WorkspaceSidebarContext {
  collapsed: boolean;
  activeTab: WorkspaceTab;
  commands: WorkspaceCommands;
}
