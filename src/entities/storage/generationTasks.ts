import { sanitizeGenerationRequestParamsSnapshot } from '../generation-params/logicalRegistry';
import { interruptedStatusToFailed, isActiveGenerationStatus, normalizeGenerationStatus } from '../../domain/generationStatus';
import type { AttachmentSummary, BatchGenerationItem, GeneratedImage, GenerationTask } from '../../domain/generationTask';

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

function sanitizeRequestSnapshot(snapshot: Partial<GenerationTask['request']>): GenerationTask['request'] {
  return {
    createdAt: Number(snapshot.createdAt ?? Date.now()),
    mode: snapshot.mode === 'edit' ? 'edit' : 'generate',
    prompt: snapshot.prompt || '',
    endpoint: snapshot.endpoint || '',
    providerLabel: snapshot.providerLabel || '',
    model: snapshot.model || '',
    modelLabel: snapshot.modelLabel || '',
    payload: snapshot.payload && typeof snapshot.payload === 'object' ? snapshot.payload as Record<string, unknown> : {},
    warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings.map(String) : [],
    attachments: Array.isArray(snapshot.attachments) ? snapshot.attachments.map((item) => sanitizeAttachment(item as Partial<AttachmentSummary>)) : [],
    params: sanitizeGenerationRequestParamsSnapshot(snapshot.params)
  };
}

function sanitizeGeneratedImage(image: Partial<GeneratedImage>, fallbackIndex = 0): GeneratedImage | null {
  if (!image.src || typeof image.src !== 'string') return null;
  if (image.src.startsWith('blob:')) return null;
  return {
    id: image.id || uid('image'),
    taskId: image.taskId,
    batchItemId: image.batchItemId,
    batchItemIndex: image.batchItemIndex,
    src: image.src,
    thumbnailSrc: typeof image.thumbnailSrc === 'string' && !image.thumbnailSrc.startsWith('blob:') ? image.thumbnailSrc : undefined,
    storageAssetKey: typeof image.storageAssetKey === 'string' ? image.storageAssetKey : undefined,
    storageThumbnailKey: typeof image.storageThumbnailKey === 'string' ? image.storageThumbnailKey : undefined,
    storageAssetLoaded: typeof image.storageAssetLoaded === 'boolean' ? image.storageAssetLoaded : undefined,
    format: image.format || 'png',
    kind: image.kind === 'partial' ? 'partial' : 'final',
    index: Number.isFinite(Number(image.index)) ? Number(image.index) : fallbackIndex,
    createdAt: Number(image.createdAt ?? Date.now()),
    raw: image.raw,
    request: image.request ? sanitizeRequestSnapshot(image.request as any) : undefined
  };
}


function sanitizeBatchItem(item: Partial<BatchGenerationItem>, taskId: string, fallbackIndex = 0): BatchGenerationItem {
  const request = sanitizeRequestSnapshot((item.request ?? {}) as any);
  const loadedStatus = normalizeGenerationStatus(item.status);
  const status = interruptedStatusToFailed(loadedStatus);
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
    error: isActiveGenerationStatus(loadedStatus) ? 'Interrupted by page reload.' : item.error ?? null
  };
}

export function sanitizeGenerationTask(task: Partial<GenerationTask>): GenerationTask | null {
  const id = task.id || uid('task');
  const request = sanitizeRequestSnapshot((task.request ?? {}) as any);
  const loadedStatus = normalizeGenerationStatus(task.status);
  const status = interruptedStatusToFailed(loadedStatus);
  const images = Array.isArray(task.images)
    ? task.images.flatMap((image, index) => {
      const normalized = sanitizeGeneratedImage(image as Partial<GeneratedImage>, index);
      return normalized ? [{ ...normalized, taskId: id, request: normalized.request ?? request }] : [];
    })
    : [];
  const batchItems = Array.isArray(task.batch?.items) ? task.batch.items.map((item, index) => sanitizeBatchItem(item as Partial<BatchGenerationItem>, id, index)) : [];

  return {
    id,
    kind: task.kind === 'batch' ? 'batch' : 'single',
    status,
    createdAt: Number(task.createdAt ?? request.createdAt ?? Date.now()),
    updatedAt: Number(task.updatedAt ?? task.createdAt ?? Date.now()),
    request,
    images,
    batch: task.kind === 'batch' || batchItems.length > 0 ? {
      intervalMs: Number(task.batch?.intervalMs ?? 0),
      items: batchItems
    } : undefined,
    raw: task.raw,
    error: isActiveGenerationStatus(loadedStatus) ? 'Interrupted by page reload.' : task.error ?? null
  };
}

export function normalizeGenerationTasks(tasks: unknown, limit = 120): GenerationTask[] {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .slice(0, limit)
    .flatMap((task) => {
      const normalized = sanitizeGenerationTask(task as Partial<GenerationTask>);
      return normalized ? [normalized] : [];
    });
}

export function toLightGenerationTaskSnapshot(tasks: GenerationTask[], limit = 40): GenerationTask[] {
  return normalizeGenerationTasks(tasks, limit).map((task) => ({
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
