import { sanitizeGenerationRequestParamsSnapshot } from '../generation-params/logicalRegistry';
import { retainGenerationTasksByCompletedLimit } from '../../domain/generationHistorySettings';
import { interruptedStatusToFailed, isActiveGenerationStatus, normalizeGenerationStatus } from '../../domain/generationStatus';
import type { AttachmentSummary, BatchGenerationItem, GeneratedImage, GenerationTask } from '../../domain/generationTask';
import { normalizeGalleryPath, normalizeGalleryPaths } from '../../domain/galleryFilesystem';

function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeAttachment(attachment: Partial<AttachmentSummary>): AttachmentSummary {
  const previewUrl = typeof attachment.previewUrl === 'string' && !attachment.previewUrl.startsWith('blob:') ? attachment.previewUrl : undefined;
  return {
    role: attachment.role === 'mask' || attachment.role === 'reference' || attachment.role === 'target' ? attachment.role : 'reference',
    name: attachment.name || 'attachment',
    size: Number(attachment.size ?? 0),
    type: attachment.type || '',
    ...(previewUrl ? { previewUrl } : {})
  };
}

function sanitizeBatchAggregate(value: unknown): GenerationTask['request']['aggregate'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  if (source.kind !== 'batch') return undefined;
  return {
    kind: 'batch',
    itemCount: Number(source.itemCount ?? 0),
    intervalMs: Number(source.intervalMs ?? 0)
  };
}

function sanitizeRequestSnapshot(snapshot: Partial<GenerationTask['request']>): GenerationTask['request'] {
  const aggregate = sanitizeBatchAggregate(snapshot.aggregate);
  return {
    createdAt: Number(snapshot.createdAt ?? Date.now()),
    mode: snapshot.mode === 'edit' ? 'edit' : 'generate',
    prompt: snapshot.prompt || '',
    endpoint: snapshot.endpoint || '',
    providerLabel: snapshot.providerLabel || '',
    providerAdapterId: typeof snapshot.providerAdapterId === 'string' ? snapshot.providerAdapterId : undefined,
    model: snapshot.model || '',
    modelLabel: snapshot.modelLabel || '',
    payload: snapshot.payload && typeof snapshot.payload === 'object' ? snapshot.payload as Record<string, unknown> : {},
    warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings.map(String) : [],
    surfaceId: typeof snapshot.surfaceId === 'string' ? snapshot.surfaceId : undefined,
    providerParams: snapshot.providerParams && typeof snapshot.providerParams === 'object' && !Array.isArray(snapshot.providerParams) ? snapshot.providerParams as Record<string, unknown> : undefined,
    parameterSummary: snapshot.parameterSummary && typeof snapshot.parameterSummary === 'object' && !Array.isArray(snapshot.parameterSummary) ? snapshot.parameterSummary as any : undefined,
    aggregate,
    attachments: Array.isArray(snapshot.attachments) ? snapshot.attachments.map((item) => sanitizeAttachment(item as Partial<AttachmentSummary>)) : [],
    params: aggregate ? { ...(snapshot.params ?? {}) } : sanitizeGenerationRequestParamsSnapshot(snapshot.params)
  };
}

function sanitizeGeneratedImage(image: Partial<GeneratedImage>, fallbackIndex = 0): GeneratedImage | null {
  const src = typeof image.src === 'string' ? image.src : '';
  const storageAssetKey = typeof image.storageAssetKey === 'string' && image.storageAssetKey.trim() ? image.storageAssetKey : undefined;
  const storageThumbnailKey = typeof image.storageThumbnailKey === 'string' && image.storageThumbnailKey.trim() ? image.storageThumbnailKey : undefined;
  if (!src && !storageAssetKey) return null;
  if (src.startsWith('blob:')) return null;
  const thumbnailSrc = typeof image.thumbnailSrc === 'string' && !image.thumbnailSrc.startsWith('blob:') ? image.thumbnailSrc : undefined;
  return {
    id: image.id || uid('image'),
    taskId: image.taskId,
    batchItemId: image.batchItemId,
    batchItemIndex: image.batchItemIndex,
    src,
    thumbnailSrc,
    storageAssetKey,
    storageThumbnailKey,
    storageAssetLoaded: typeof image.storageAssetLoaded === 'boolean' ? image.storageAssetLoaded : undefined,
    filename: typeof image.filename === 'string' && image.filename.trim() ? image.filename.trim() : undefined,
    format: image.format || 'png',
    kind: image.kind === 'partial' ? 'partial' : 'final',
    index: Number.isFinite(Number(image.index)) ? Number(image.index) : fallbackIndex,
    createdAt: Number(image.createdAt ?? Date.now()),
    raw: image.raw,
    request: image.request ? sanitizeRequestSnapshot(image.request as any) : undefined
  };
}


interface GenerationTaskNormalizationOptions {
  interruptActive?: boolean;
}

function sanitizeBatchItem(
  item: Partial<BatchGenerationItem>,
  taskId: string,
  fallbackIndex = 0,
  options: GenerationTaskNormalizationOptions = {}
): BatchGenerationItem {
  const request = sanitizeRequestSnapshot((item.request ?? {}) as any);
  const loadedStatus = normalizeGenerationStatus(item.status);
  const status = options.interruptActive === false ? loadedStatus : interruptedStatusToFailed(loadedStatus);
  const images = Array.isArray(item.images)
    ? item.images.flatMap((image, index) => {
      const normalized = sanitizeGeneratedImage(image as Partial<GeneratedImage>, index);
      return normalized ? [{ ...normalized, taskId, batchItemId: item.id || `batch-item-${fallbackIndex}`, batchItemIndex: fallbackIndex, request: normalized.request ?? request }] : [];
    })
    : [];

  return {
    id: item.id || uid('batch-item'),
    index: Number.isFinite(Number(item.index)) ? Number(item.index) : fallbackIndex,
    status,
    request,
    images,
    raw: item.raw,
    error: options.interruptActive !== false && isActiveGenerationStatus(loadedStatus)
      ? 'Interrupted by page reload.'
      : item.error ?? null
  };
}

export function sanitizeGenerationTask(
  task: Partial<GenerationTask>,
  options: GenerationTaskNormalizationOptions = {}
): GenerationTask | null {
  const id = task.id || uid('task');
  const request = sanitizeRequestSnapshot((task.request ?? {}) as any);
  const loadedStatus = normalizeGenerationStatus(task.status);
  const status = options.interruptActive === false ? loadedStatus : interruptedStatusToFailed(loadedStatus);
  const images = Array.isArray(task.images)
    ? task.images.flatMap((image, index) => {
      const normalized = sanitizeGeneratedImage(image as Partial<GeneratedImage>, index);
      return normalized ? [{ ...normalized, taskId: id, request: normalized.request ?? request }] : [];
    })
    : [];
  const batchItems = Array.isArray(task.batch?.items)
    ? task.batch.items.map((item, index) => sanitizeBatchItem(item as Partial<BatchGenerationItem>, id, index, options))
    : [];

  return {
    id,
    kind: task.kind === 'batch' ? 'batch' : 'single',
    status,
    galleryPath: normalizeGalleryPath(task.galleryPath),
    galleryPaths: normalizeGalleryPaths(task.galleryPaths, task.galleryPath),
    createdAt: Number(task.createdAt ?? request.createdAt ?? Date.now()),
    updatedAt: Number(task.updatedAt ?? task.createdAt ?? Date.now()),
    request,
    images,
    batch: task.kind === 'batch' || batchItems.length > 0 ? {
      intervalMs: Number(task.batch?.intervalMs ?? 0),
      items: batchItems
    } : undefined,
    raw: task.raw,
    error: options.interruptActive !== false && isActiveGenerationStatus(loadedStatus)
      ? 'Interrupted by page reload.'
      : task.error ?? null
  };
}

export function normalizeGenerationTasks(
  tasks: unknown,
  options: GenerationTaskNormalizationOptions = {}
): GenerationTask[] {
  if (!Array.isArray(tasks)) return [];
  const seen = new Set<string>();
  const normalizedTasks: GenerationTask[] = [];

  for (const task of tasks) {
    const normalized = sanitizeGenerationTask(task as Partial<GenerationTask>, options);
    if (!normalized || seen.has(normalized.id)) continue;
    seen.add(normalized.id);
    normalizedTasks.push(normalized);
  }

  return normalizedTasks;
}

function imageHasPersistableAsset(image: Partial<GeneratedImage>): boolean {
  return image.kind !== 'partial' && Boolean(image.src || image.storageAssetKey);
}

export function taskHasPersistableGenerationImage(task: Partial<GenerationTask>): boolean {
  const images = Array.isArray(task.images) ? task.images : [];
  if (images.some((image) => imageHasPersistableAsset(image as Partial<GeneratedImage>))) return true;
  const items = Array.isArray(task.batch?.items) ? task.batch.items : [];
  return items.some((item) => Array.isArray(item.images) && item.images.some((image) => imageHasPersistableAsset(image as Partial<GeneratedImage>)));
}

export function isEmptyActiveGenerationTask(task: Partial<GenerationTask>): boolean {
  const status = normalizeGenerationStatus(task.status);
  return isActiveGenerationStatus(status) && !taskHasPersistableGenerationImage(task);
}

export function toPersistableGenerationTaskSnapshot(tasks: GenerationTask[], completedLimit = 120): GenerationTask[] {
  const normalized = normalizeGenerationTasks(tasks.filter((task) => !isEmptyActiveGenerationTask(task)));
  return retainGenerationTasksByCompletedLimit(normalized, completedLimit);
}

export function toLightGenerationTaskSnapshot(tasks: GenerationTask[], limit = 40): GenerationTask[] {
  return normalizeGenerationTasks(tasks).slice(0, Math.max(0, Math.floor(limit))).map((task) => ({
    ...task,
    raw: undefined,
    images: task.images.slice(0, 3).map((image) => ({ ...image, raw: undefined })),
    batch: task.batch ? {
      ...task.batch,
      items: task.batch.items.map((item) => ({
        ...item,
        raw: undefined,
        images: item.images.slice(0, 3).map((image) => ({ ...image, raw: undefined }))
      }))
    } : undefined
  }));
}
