import { clearServerGenerationTasks, deleteServerGenerationTask } from '../../processes/server-generation-actions';
import { sanitizeProviderModeDraftForModel } from '../../entities/provider/attachmentCompatibility';
import { normalizeSelectedModel } from '../../entities/studio-settings';
import { getProviderGenerationRequestSurfaceById } from '../../entities/generation-params/requestSurface';
import { resolveProviderGenerationModeForRestore } from '../../entities/provider/modeResolution';
import type { GenerationRequestSnapshot } from '../../domain/generationTask';
import type { StudioSettings } from '../../domain/studioSettings';
import type { RestoreRequestCommands, TaskHistoryCommands, WorkspaceNavigationCommands } from './types';

export async function deleteTaskCommand(args: {
  taskId: string;
  selectedTaskId: string | null;
  navigation: WorkspaceNavigationCommands;
  taskHistory: Pick<TaskHistoryCommands, 'deleteTask'>;
  serverActions?: { deleteTask(taskId: string): Promise<void> };
}) {
  const { taskId, selectedTaskId, navigation, taskHistory } = args;
  await (args.serverActions?.deleteTask ?? deleteServerGenerationTask)(taskId);
  taskHistory.deleteTask(taskId);
  if (selectedTaskId === taskId) {
    navigation.setSelectedTaskId(null);
    navigation.setSelectedImageId(null);
  }
}

export async function clearTasksCommand(args: {
  navigation: WorkspaceNavigationCommands;
  taskHistory: Pick<TaskHistoryCommands, 'clearTasks'>;
  serverActions?: { clearTasks(): Promise<void> };
}) {
  await (args.serverActions?.clearTasks ?? clearServerGenerationTasks)();
  args.taskHistory.clearTasks();
  args.navigation.setSelectedTaskId(null);
  args.navigation.setSelectedImageId(null);
}

export function restoreRequestToWorkspaceCommand(snapshot: GenerationRequestSnapshot, commands: RestoreRequestCommands) {
  const modelFromHistory = commands.settings.models.find((model) => model.modelId === snapshot.model || model.name === snapshot.modelLabel);
  const selectedModelId = modelFromHistory?.id ?? commands.settings.selectedModelId;
  const restoredMode = resolveProviderGenerationModeForRestore({
    settings: commands.settings,
    modelId: selectedModelId,
    snapshotProviderModeId: snapshot.providerModeId,
    snapshotLegacyMode: snapshot.mode
  });
  const sanitized = sanitizeProviderModeDraftForModel({
    providerModeId: restoredMode.id,
    targetImage: null,
    referenceImages: [],
    mask: null
  }, commands.settings, selectedModelId, snapshot.mode);

  const params = getProviderGenerationRequestSurfaceById(snapshot.surfaceId).restoreParamsFromSnapshot({
    previous: commands.params,
    snapshot
  });
  commands.replaceActiveComposerRequest({
    providerModeId: sanitized.value.providerModeId,
    params,
    selectedModelId,
    targetImage: sanitized.value.targetImage,
    referenceImages: sanitized.value.referenceImages,
    mask: sanitized.value.mask
  }, sanitized.changed
    ? commands.t('composer.compatibilityAdjustedRequest')
    : snapshot.attachments.length > 0
      ? commands.t('composer.restoreNeedsFiles')
      : null);

  commands.setSelectedTaskId(null);
  commands.setSelectedImageId(null);
}
