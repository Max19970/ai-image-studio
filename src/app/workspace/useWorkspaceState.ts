import type { WorkspaceState } from './types';
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
  const composer = useComposerWorkspaceState(settings);
  const taskSelection = useTaskSelectionState(settings.studioSettings.maxStoredGenerationTasks);
  const execution = useGenerationExecutionState(taskSelection.tasks);
  const providerProbe = useProviderProbeState(settings.studioSettings);
  const requestPresets = useRequestPresetWorkspaceState();

  return {
    ...settings,
    ...composer,
    ...navigation,
    ...galleryFilesystem,
    ...taskSelection,
    ...execution,
    ...providerProbe,
    ...requestPresets
  };
}
