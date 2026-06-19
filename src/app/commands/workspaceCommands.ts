import { cloneParams } from '../../domain/generationSnapshots';
import { sanitizeGenerationDraftForModel } from '../../entities/provider/compatibility';
import { getProviderGenerationRequestSurfaceById } from '../../entities/generation-params/requestSurface';
import type { BatchComposerDraft, GenerationRequestSnapshot } from '../../domain/generationTask';
import type { ImageParams } from '../../domain/imageParams';
import type { StudioSettings } from '../../domain/studioSettings';
import type { WorkMode } from '../../domain/workMode';
import { normalizeSelectedModel } from '../../domain/generationSnapshots';
import type { RestoreRequestCommands, StateSetter, TaskHistoryCommands, WorkspaceNavigationCommands } from './types';

export function deleteTaskCommand(args: {
  taskId: string;
  selectedTaskId: string | null;
  navigation: WorkspaceNavigationCommands;
  taskHistory: Pick<TaskHistoryCommands, 'deleteTask'>;
}) {
  const { taskId, selectedTaskId, navigation, taskHistory } = args;
  taskHistory.deleteTask(taskId);
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
  args.navigation.setSelectedTaskId(null);
  args.navigation.setSelectedImageId(null);
}

export function makeBatchDraft(args: {
  source?: Partial<BatchComposerDraft>;
  fallbackParams: ImageParams;
  fallbackSelectedModelId: string;
}): BatchComposerDraft {
  const { source, fallbackParams, fallbackSelectedModelId } = args;
  return {
    id: crypto.randomUUID(),
    mode: source?.mode ?? 'generate',
    params: cloneParams(source?.params ?? fallbackParams),
    selectedModelId: source?.selectedModelId ?? fallbackSelectedModelId,
    targetImage: source?.targetImage ?? null,
    referenceImages: [...(source?.referenceImages ?? [])],
    mask: source?.mask ?? null
  };
}

export function openBatchComposerCommand(args: {
  mode: WorkMode;
  params: ImageParams;
  selectedModelId: string;
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  setDrafts: StateSetter<BatchComposerDraft[]>;
  setOpen: StateSetter<boolean>;
  setWorkspaceTab: StateSetter<'images' | 'info' | 'settings'>;
}) {
  const { mode, params, selectedModelId, targetImage, referenceImages, mask, setDrafts, setOpen, setWorkspaceTab } = args;
  setDrafts((current) => current.length > 0 ? current : [makeBatchDraft({
    source: { mode, params, selectedModelId, targetImage, referenceImages, mask },
    fallbackParams: params,
    fallbackSelectedModelId: selectedModelId
  })]);
  setOpen(true);
  setWorkspaceTab('images');
}

export function restoreRequestToWorkspaceCommand(snapshot: GenerationRequestSnapshot, commands: RestoreRequestCommands) {
  const modelFromHistory = commands.settings.models.find((model) => model.modelId === snapshot.model || model.name === snapshot.modelLabel);
  const selectedModelId = modelFromHistory?.id ?? commands.settings.selectedModelId;
  const sanitized = sanitizeGenerationDraftForModel({
    mode: snapshot.mode,
    targetImage: null,
    referenceImages: [],
    mask: null
  }, commands.settings, selectedModelId);

  commands.setMode(sanitized.value.mode);
  commands.setCompatibilityNotice(sanitized.changed ? commands.t('composer.compatibilityAdjustedRequest') : null);
  commands.setBatchComposerOpen(false);
  commands.setParams((prev) => getProviderGenerationRequestSurfaceById(snapshot.surfaceId).restoreParamsFromSnapshot({ previous: prev, snapshot }));

  if (modelFromHistory) {
    commands.setSettings((prev: StudioSettings) => normalizeSelectedModel({ ...prev, selectedModelId: modelFromHistory.id }));
  }

  commands.setSelectedTaskId(null);
  commands.setSelectedImageId(null);
}
