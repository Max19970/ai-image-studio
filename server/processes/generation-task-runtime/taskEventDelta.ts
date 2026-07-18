import type { GeneratedImage, GenerationProgress, GenerationTask } from '../../../src/domain/generationTask';

export interface GenerationTasksDeltaEvent {
  revision: number;
  taskIds?: string[];
  upserted: GenerationTask[];
  deletedIds: string[];
}

function imageDeltaSignature(image: GeneratedImage): string {
  return [
    image.id,
    image.kind,
    image.index,
    image.batchItemId ?? '',
    image.batchItemIndex ?? '',
    image.storageAssetKey ?? '',
    image.storageThumbnailKey ?? '',
    image.storageAssetLoaded === false ? 'lazy' : 'full',
    image.src?.length ?? 0,
    image.thumbnailSrc?.length ?? 0,
    image.createdAt
  ].join(':');
}

function progressDeltaSignature(progress: GenerationProgress | null | undefined): string {
  if (!progress) return '';
  return [
    progress.providerAdapterId ?? '',
    progress.percent ?? '',
    progress.step ?? '',
    progress.maxSteps ?? '',
    progress.stage ?? '',
    progress.nodeId ?? '',
    progress.message ?? '',
    progress.updatedAt
  ].join(':');
}

function taskDeltaSignature(task: GenerationTask): string {
  return JSON.stringify({
    id: task.id,
    kind: task.kind ?? 'single',
    status: task.status,
    updatedAt: task.updatedAt,
    galleryPath: task.galleryPath ?? '/',
    galleryPaths: task.galleryPaths ?? [task.galleryPath ?? '/'],
    error: task.error ?? null,
    progress: progressDeltaSignature(task.progress),
    images: task.images.map(imageDeltaSignature),
    batch: task.batch ? {
      intervalMs: task.batch.intervalMs,
      items: task.batch.items.map((item) => ({
        id: item.id,
        status: item.status,
        error: item.error ?? null,
        progress: progressDeltaSignature(item.progress),
        images: item.images.map(imageDeltaSignature)
      }))
    } : null
  });
}

function hasTaskOrderChanged(previousTasks: GenerationTask[], nextTasks: GenerationTask[]): boolean {
  if (previousTasks.length !== nextTasks.length) return true;
  return nextTasks.some((task, index) => previousTasks[index]?.id !== task.id);
}

export function createTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number): GenerationTasksDeltaEvent {
  const previousSignatures = new Map(previousTasks.map((task) => [task.id, taskDeltaSignature(task)]));
  const nextIds = new Set(nextTasks.map((task) => task.id));
  const deletedIds = previousTasks.flatMap((task) => nextIds.has(task.id) ? [] : [task.id]);
  const upserted = nextTasks.filter((task) => previousSignatures.get(task.id) !== taskDeltaSignature(task));
  const taskIds = hasTaskOrderChanged(previousTasks, nextTasks) ? nextTasks.map((task) => task.id) : undefined;
  return {
    revision,
    ...(taskIds ? { taskIds } : {}),
    upserted,
    deletedIds
  };
}

export function createTaskUpsertDelta(task: GenerationTask, revision: number, taskIds?: string[]): GenerationTasksDeltaEvent {
  return {
    revision,
    ...(taskIds ? { taskIds } : {}),
    upserted: [task],
    deletedIds: []
  };
}

export function isEmptyTasksDelta(delta: GenerationTasksDeltaEvent): boolean {
  return delta.upserted.length === 0 && delta.deletedIds.length === 0 && delta.taskIds === undefined;
}
