import { getActiveModel, getProviderForModel, toProviderSettings } from '../entities/studio-settings';
import { captureGenerationRequestParamsSnapshot } from '../entities/generation-params/logicalRegistry';
import { getProviderAdapterForSettings } from '../entities/provider';
import type {
  AttachmentSummary,
  BatchGenerationItem,
  GeneratedImage,
  GenerationModel,
  GenerationProvider,
  GenerationRequestSnapshot,
  GenerationTask,
  ImageParams,
  ProviderSettings,
  StudioSettings,
  WorkMode
} from './types';

export function summarizeFile(role: AttachmentSummary['role'], file: File): AttachmentSummary {
  return {
    role,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl: URL.createObjectURL(file)
  };
}

export function summarizeAttachments(targetImage: File | null, referenceImages: File[], mask: File | null): AttachmentSummary[] {
  const attachments: AttachmentSummary[] = [];
  if (targetImage) attachments.push(summarizeFile('target', targetImage));
  referenceImages.forEach((file) => attachments.push(summarizeFile('reference', file)));
  if (mask) attachments.push(summarizeFile('mask', mask));
  return attachments;
}

export function cloneParams(params: ImageParams): ImageParams {
  return { ...params };
}

export function providerContextForModel(settings: StudioSettings, modelId: string) {
  const model = settings.models.find((item) => item.id === modelId) ?? getActiveModel(settings);
  const generationProvider = getProviderForModel(settings, model);
  return {
    model,
    generationProvider,
    provider: toProviderSettings(generationProvider, model)
  };
}

export function normalizeSelectedModel(settings: StudioSettings): StudioSettings {
  if (settings.models.some((model) => model.id === settings.selectedModelId)) return settings;
  return { ...settings, selectedModelId: settings.models[0]?.id ?? '' };
}

export function captureRequestSnapshot(args: {
  mode: WorkMode;
  params: ImageParams;
  provider: ProviderSettings;
  activeProvider: GenerationProvider | null;
  activeModel: GenerationModel | null;
  payload: Record<string, unknown>;
  warnings: string[];
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  fallbackProviderLabel: string;
}): GenerationRequestSnapshot {
  const { mode, params, provider, activeProvider, activeModel, payload, warnings, targetImage, referenceImages, mask, fallbackProviderLabel } = args;
  return {
    createdAt: Date.now(),
    mode,
    prompt: params.prompt.trim(),
    endpoint: mode === 'generate' ? provider.generationEndpoint : provider.editEndpoint,
    providerLabel: activeProvider?.name || provider.generationEndpoint || provider.editEndpoint || fallbackProviderLabel,
    model: provider.modelId,
    modelLabel: activeModel?.name || provider.modelId,
    payload,
    warnings,
    attachments: summarizeAttachments(targetImage, referenceImages, mask),
    params: captureGenerationRequestParamsSnapshot(params, provider, mode, getProviderAdapterForSettings(provider).generationParams)
  };
}

export function attachSnapshot(images: GeneratedImage[], snapshot: GenerationRequestSnapshot, taskId: string): GeneratedImage[] {
  return images.map((image) => ({ ...image, taskId, request: snapshot }));
}

export function attachBatchSnapshot(images: GeneratedImage[], snapshot: GenerationRequestSnapshot, taskId: string, itemId: string, itemIndex: number, startIndex: number): GeneratedImage[] {
  return images.map((image, offset) => ({
    ...image,
    index: startIndex + offset,
    taskId,
    batchItemId: itemId,
    batchItemIndex: itemIndex,
    request: snapshot
  }));
}

export function patchBatchItem(task: GenerationTask, itemId: string, recipe: (item: BatchGenerationItem) => BatchGenerationItem): GenerationTask {
  if (!task.batch) return task;
  return {
    ...task,
    batch: {
      ...task.batch,
      items: task.batch.items.map((item) => item.id === itemId ? recipe(item) : item)
    }
  };
}


export function getStatusText(task: GenerationTask | null, t: (key: string, vars?: Record<string, string | number | boolean | null | undefined>) => string) {
  if (!task) return null;
  if (task.kind === 'batch') {
    if (task.status === 'created' || task.status === 'queued') return t('app.status.batchQueued');
    if (task.status === 'sending' || task.status === 'running' || task.status === 'retrying') {
      return t('app.status.batchRunning', { done: task.images.length, total: expectedImageCount(task) });
    }
    if (task.status === 'failed') return t('app.status.failed', { error: task.error || t('app.errorUnknown') });
    if (task.status === 'cancelled') return t('app.status.cancelled');
    return t('app.status.batchDone', { count: task.images.length });
  }
  if (task.status === 'created' || task.status === 'queued') return t('app.status.queued');
  if (task.status === 'sending') return t('app.status.sending');
  if (task.status === 'running' || task.status === 'retrying') return t('app.status.streaming', { count: task.images.length });
  if (task.status === 'failed') return t('app.status.failed', { error: task.error || t('app.errorUnknown') });
  if (task.status === 'cancelled') return t('app.status.cancelled');
  return t('app.status.done', { count: task.images.length });
}

export function expectedImageCount(task: GenerationTask): number {
  if (task.batch) {
    return task.batch.items.reduce((sum, item) => sum + Math.max(1, Number(item.request.payload.n ?? item.request.params.n ?? 1)), 0);
  }
  return Math.max(1, Number(task.request.payload.n ?? task.request.params.n ?? 1));
}
