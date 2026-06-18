import type { AppCommands } from '../../interface/context/commands';
import type { WorkspaceContexts, WorkspaceDerivedState, WorkspaceState } from './types';
import { createDockContext } from './contexts/createDockContext';
import { createMainContext } from './contexts/createMainContext';
import { createModalsContext } from './contexts/createModalsContext';
import { createSidebarContext } from './contexts/createSidebarContext';

export function createWorkspaceContexts(
  state: WorkspaceState,
  derived: WorkspaceDerivedState,
  commands: AppCommands
): WorkspaceContexts {
  const args = { state, derived, commands };

  return {
    sidebar: createSidebarContext(args),
    main: createMainContext(args),
    dock: createDockContext(args),
    modals: createModalsContext(args)
  };
}
