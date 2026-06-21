import { cloneParams } from '../../domain/generationSnapshots';
import { clearServerGenerationTasks, deleteServerGenerationTask } from '../../infrastructure/api';
import { sanitizeProviderModeDraftForModel } from '../../entities/provider/compatibility';
import { normalizeSelectedModel } from '../../entities/studio-settings';
import { getProviderGenerationRequestSurfaceById } from '../../entities/generation-params/requestSurface';
import { resolveProviderGenerationMode } from '../../entities/provider/modeResolution';
import type { BatchComposerDraft, GenerationRequestSnapshot } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeId } from '../../domain/providerMode';
import type { StudioSettings } from '../../domain/studioSettings';
import type { RestoreRequestCommands, StateSetter, TaskHistoryCommands, WorkspaceNavigationCommands } from './types';

export function deleteTaskCommand(args: {
  taskId: string;
  selectedTaskId: string | null;
  navigation: WorkspaceNavigationCommands;
  taskHistory: Pick<TaskHistoryCommands, 'deleteTask'>;
}) {
  const { taskId, selectedTaskId, navigation, taskHistory } = args;
  taskHistory.deleteTask(taskId);
  void deleteServerGenerationTask(taskId).catch(console.error);
  if (selectedTaskId === taskId) {
    navigation.setSelectedTaskId(null);
    navigation.setSelectedImageId(null);
  }
}

export function clearTasksCommand(args: {
  navigation: WorkspaceNavigationCommands;
  taskHistory: Pick<TaskHistoryCommands, 'clearTasks'>;
}) {
  args.taskHistory.clearTasks();
  void clearServerGenerationTasks().catch(console.error);
  args.navigation.setSelectedTaskId(null);
  args.navigation.setSelectedImageId(null);
}

export function makeBatchDraft(args: {
  source?: Partial<BatchComposerDraft>;
  fallbackParams: ImageParams;
  fallbackSelectedModelId: string;
  fallbackProviderModeId: ProviderGenerationModeId;
}): BatchComposerDraft {
  const { source, fallbackParams, fallbackSelectedModelId, fallbackProviderModeId } = args;
  return {
    id: crypto.randomUUID(),
    providerModeId: source?.providerModeId ?? fallbackProviderModeId,
    params: cloneParams(source?.params ?? fallbackParams),
    selectedModelId: source?.selectedModelId ?? fallbackSelectedModelId,
    targetImage: source?.targetImage ?? null,
    referenceImages: [...(source?.referenceImages ?? [])],
    mask: source?.mask ?? null
  };
}

export function openBatchComposerCommand(args: {
  providerModeId: ProviderGenerationModeId;
  params: ImageParams;
  selectedModelId: string;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  setDrafts: StateSetter<BatchComposerDraft[]>;
  setOpen: StateSetter<boolean>;
  setWorkspaceTab: StateSetter<'images' | 'info' | 'settings'>;
}) {
  const { providerModeId, params, selectedModelId, targetImage, referenceImages, mask, setDrafts, setOpen, setWorkspaceTab } = args;
  setDrafts((current) => current.length > 0 ? current : [makeBatchDraft({
    source: { providerModeId, params, selectedModelId, targetImage, referenceImages, mask },
    fallbackParams: params,
    fallbackSelectedModelId: selectedModelId,
    fallbackProviderModeId: providerModeId
  })]);
  setOpen(true);
  setWorkspaceTab('images');
}

export function restoreRequestToWorkspaceCommand(snapshot: GenerationRequestSnapshot, commands: RestoreRequestCommands) {
  const modelFromHistory = commands.settings.models.find((model) => model.modelId === snapshot.model || model.name === snapshot.modelLabel);
  const selectedModelId = modelFromHistory?.id ?? commands.settings.selectedModelId;
  const snapshotWithProviderMode = snapshot as GenerationRequestSnapshot & { providerModeId?: ProviderGenerationModeId };
  const restoredMode = resolveProviderGenerationMode({
    settings: commands.settings,
    modelId: selectedModelId,
    providerModeId: snapshotWithProviderMode.providerModeId,
    legacyMode: snapshot.mode
  }).activeMode;
  const sanitized = sanitizeProviderModeDraftForModel({
    providerModeId: restoredMode.id,
    targetImage: null,
    referenceImages: [],
    mask: null
  }, commands.settings, selectedModelId, snapshot.mode);

  commands.setProviderModeId(sanitized.value.providerModeId);
  commands.setCompatibilityNotice(sanitized.changed ? commands.t('composer.compatibilityAdjustedRequest') : null);
  commands.setBatchComposerOpen(false);
  commands.setParams((prev) => getProviderGenerationRequestSurfaceById(snapshot.surfaceId).restoreParamsFromSnapshot({ previous: prev, snapshot }));

  if (modelFromHistory) {
    commands.setSettings((prev: StudioSettings) => normalizeSelectedModel({ ...prev, selectedModelId: modelFromHistory.id }));
  }

  commands.setSelectedTaskId(null);
  commands.setSelectedImageId(null);
}
