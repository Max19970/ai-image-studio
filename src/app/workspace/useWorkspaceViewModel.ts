import { useMemo } from 'react';
import type { TranslateFn } from '../commands/types';
import { createWorkspaceContexts } from './createWorkspaceContexts';
import type { WorkspaceViewModel } from './types';
import { useWorkspaceCommands } from './useWorkspaceCommands';
import { useWorkspaceDerivedState } from './useWorkspaceDerivedState';
import { useWorkspaceState } from './useWorkspaceState';

export function useWorkspaceViewModel(t: TranslateFn): WorkspaceViewModel {
  const state = useWorkspaceState();
  const derived = useWorkspaceDerivedState(state, t);
  const commands = useWorkspaceCommands(state, derived, t);
  const contexts = useMemo(() => createWorkspaceContexts(state, derived, commands), [state, derived, commands]);

  return {
    state,
    derived,
    commands,
    contexts
  };
}
