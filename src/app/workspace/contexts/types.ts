import type { AppCommands } from '../../../interface/context/commands';
import type { WorkspaceDerivedState, WorkspaceState } from '../types';

export interface WorkspaceContextFactoryArgs {
  state: WorkspaceState;
  derived: WorkspaceDerivedState;
  commands: AppCommands;
}
