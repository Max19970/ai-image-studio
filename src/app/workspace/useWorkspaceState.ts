import type { WorkspaceState } from './types';
import { useBatchWorkspaceState } from './state/useBatchWorkspaceState';
import { useComposerWorkspaceState } from './state/useComposerWorkspaceState';
import { useGenerationExecutionState } from './state/useGenerationExecutionState';
import { useGalleryFilesystemState } from './state/useGalleryFilesystemState';
import { useNavigationWorkspaceState } from './state/useNavigationWorkspaceState';
import { useProviderProbeState } from './state/useProviderProbeState';
import { useRequestPresetWorkspaceState } from './state/useRequestPresetWorkspaceState';
import { useSettingsWorkspaceState } from './state/useSettingsWorkspaceState';
import { useTaskSelectionState } from './state/useTaskSelectionState';

export function useWorkspaceState(): WorkspaceState {
  const settings = useSettingsWorkspaceState();
  const navigation = useNavigationWorkspaceState();
  const galleryFilesystem = useGalleryFilesystemState();
  const composer = useComposerWorkspaceState();
  const taskSelection = useTaskSelectionState(settings.studioSettings.maxStoredGenerationTasks);
  const execution = useGenerationExecutionState(taskSelection.tasks);
  const providerProbe = useProviderProbeState(settings.studioSettings);
  const requestPresets = useRequestPresetWorkspaceState();
  const batch = useBatchWorkspaceState();

  return {
    ...composer,
    ...settings,
    ...navigation,
    ...galleryFilesystem,
    ...taskSelection,
    ...execution,
    ...providerProbe,
    ...requestPresets,
    ...batch
  };
}
