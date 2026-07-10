import { normalizeGalleryPath, normalizeGalleryPaths } from '../../../src/domain/galleryFilesystem';
import {
  collectImages,
  isRecord,
  numberOrFallback,
  stringOrFallback
} from './generationTaskCodecs';
import { hydrateTaskForPersistence } from './generationTaskHydration';
import type { JsonObject, StoredImageReference, TaskRow } from './types';

interface GenerationTaskPersistenceCandidate {
  taskId: string;
  task: JsonObject;
  fullImageCount: number;
  batchItemCount: number;
}

export interface PreparedGenerationTaskDocument {
  taskId: string;
  task: JsonObject;
  imageRefs: StoredImageReference[];
  fullImageCount: number;
}

export interface GenerationTaskPersistencePlan {
  preparedTasks: PreparedGenerationTaskDocument[];
  removedTaskIds: string[];
  replacedTaskIds: string[];
}

function isActiveStoredStatus(status: unknown): boolean {
  return status === 'queued' || status === 'sending' || status === 'running' || status === 'retrying';
}

function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/[^;,]+;base64,/i.test(value);
}

function countPersistableFullImages(images: unknown): number {
  if (!Array.isArray(images)) return 0;
  return images.reduce((total, image) => {
    if (!isRecord(image)) return total;
    const hasFull = isImageDataUrl(image.src)
      || (typeof image.storageAssetKey === 'string' && Boolean(image.storageAssetKey));
    return total + (hasFull ? 1 : 0);
  }, 0);
}

function createCandidate(taskLike: unknown): GenerationTaskPersistenceCandidate | null {
  if (!isRecord(taskLike)) return null;
  const taskId = stringOrFallback(taskLike.id, `task-${Date.now()}`);
  const createdAt = numberOrFallback(taskLike.createdAt, Date.now());
  const updatedAt = numberOrFallback(taskLike.updatedAt, createdAt);
  const galleryPaths = normalizeGalleryPaths(taskLike.galleryPaths, taskLike.galleryPath);
  const batchItems = isRecord(taskLike.batch) && Array.isArray(taskLike.batch.items) ? taskLike.batch.items : [];
  const fullImageCount = countPersistableFullImages(taskLike.images)
    + batchItems.reduce((total, item) => total + (isRecord(item) ? countPersistableFullImages(item.images) : 0), 0);
  const task: JsonObject = {
    ...taskLike,
    id: taskId,
    createdAt,
    updatedAt,
    galleryPath: galleryPaths[0] ?? normalizeGalleryPath(taskLike.galleryPath),
    galleryPaths
  };
  if (fullImageCount === 0 && isActiveStoredStatus(task.status)) return null;
  return { taskId, task, fullImageCount, batchItemCount: batchItems.length };
}

function rowMatchesCandidate(row: TaskRow, candidate: GenerationTaskPersistenceCandidate): boolean {
  return row.kind === stringOrFallback(candidate.task.kind, 'single')
    && row.status === stringOrFallback(candidate.task.status, 'failed')
    && row.gallery_path === normalizeGalleryPath(candidate.task.galleryPath)
    && row.created_at === numberOrFallback(candidate.task.createdAt, 0)
    && row.updated_at === numberOrFallback(candidate.task.updatedAt, 0)
    && row.image_count === candidate.fullImageCount
    && row.batch_item_count === candidate.batchItemCount;
}

function prepareCandidate(candidate: GenerationTaskPersistenceCandidate): PreparedGenerationTaskDocument {
  const task = hydrateTaskForPersistence(candidate.task);
  const imageRefs = collectImages(task, candidate.taskId);
  return {
    taskId: candidate.taskId,
    task,
    imageRefs,
    fullImageCount: imageRefs.filter((ref) => ref.assetKind === 'full').length
  };
}

export function createGenerationTaskPersistencePlan(
  tasks: unknown[],
  existingRows: TaskRow[]
): GenerationTaskPersistencePlan {
  const candidates: GenerationTaskPersistenceCandidate[] = [];
  const candidateIds = new Set<string>();
  tasks.forEach((taskLike) => {
    const candidate = createCandidate(taskLike);
    if (!candidate || candidateIds.has(candidate.taskId)) return;
    candidateIds.add(candidate.taskId);
    candidates.push(candidate);
  });

  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const changedCandidates = candidates.filter((candidate) => {
    const existing = existingById.get(candidate.taskId);
    return !existing || !rowMatchesCandidate(existing, candidate);
  });

  return {
    preparedTasks: changedCandidates.map(prepareCandidate),
    removedTaskIds: existingRows.filter((row) => !candidateIds.has(row.id)).map((row) => row.id),
    replacedTaskIds: changedCandidates.filter((candidate) => existingById.has(candidate.taskId)).map((candidate) => candidate.taskId)
  };
}
