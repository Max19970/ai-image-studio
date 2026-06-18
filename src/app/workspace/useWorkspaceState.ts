import type { WorkspaceState } from './types';
import { useBatchWorkspaceState } from './state/useBatchWorkspaceState';
import { useComposerWorkspaceState } from './state/useComposerWorkspaceState';
import { useGenerationExecutionState } from './state/useGenerationExecutionState';
import { useNavigationWorkspaceState } from './state/useNavigationWorkspaceState';
import { useProviderProbeState } from './state/useProviderProbeState';
import { useSettingsWorkspaceState } from './state/useSettingsWorkspaceState';
import { useTaskSelectionState } from './state/useTaskSelectionState';

export function useWorkspaceState(): WorkspaceState {
  const settings = useSettingsWorkspaceState();
  const navigation = useNavigationWorkspaceState();
  const composer = useComposerWorkspaceState();
  const taskSelection = useTaskSelectionState();
  const execution = useGenerationExecutionState();
  const providerProbe = useProviderProbeState(settings.studioSettings);
  const batch = useBatchWorkspaceState();

  return {
    ...composer,
    ...settings,
    ...navigation,
    ...taskSelection,
    ...execution,
    ...providerProbe,
    ...batch
  };
}
