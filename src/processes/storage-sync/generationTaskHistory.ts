import type { GenerationTask } from '../../domain/generationTask';
import { defaultMaxStoredGenerationTasks, normalizeMaxStoredGenerationTasks } from '../../domain/generationHistorySettings';
import { isActiveGenerationStatus } from '../../domain/generationStatus';
import type { GenerationTaskHistoryCache } from '../../entities/storage';
import { toPersistableGenerationTaskSnapshot } from '../../entities/storage';
import { localGenerationTaskCache } from '../../infrastructure/storage/localGenerationTaskCache';

export interface GenerationTaskHistoryFallbackDependencies {
  fallback?: GenerationTaskHistoryCache;
}

function imageSignature(image: GenerationTask['images'][number]): string {
  return [
    image.id,
    image.kind,
    image.index,
    image.batchItemId ?? '',
    image.storageAssetKey ?? '',
    image.storageThumbnailKey ?? '',
    image.storageAssetLoaded === false ? 'lazy' : 'full',
    image.src?.length ?? 0,
    image.thumbnailSrc?.length ?? 0
  ].join(':');
}

export function createPersistableGenerationTaskHistorySnapshot(
  tasks: GenerationTask[],
  limit = defaultMaxStoredGenerationTasks
): GenerationTask[] {
  return toPersistableGenerationTaskSnapshot(tasks, normalizeMaxStoredGenerationTasks(limit));
}

export function getGenerationTaskHistoryPersistenceSignature(tasks: readonly GenerationTask[]): string {
  return JSON.stringify(tasks.map((task) => ({
    id: task.id,
    status: task.status,
    galleryPath: task.galleryPath ?? '/',
    galleryPaths: task.galleryPaths ?? [task.galleryPath ?? '/'],
    error: task.error ?? null,
    images: task.images.map(imageSignature),
    batch: task.batch ? task.batch.items.map((item) => ({
      id: item.id,
      status: item.status,
      error: item.error ?? null,
      images: item.images.map(imageSignature)
    })) : null
  })));
}

function getFallback(dependencies: GenerationTaskHistoryFallbackDependencies = {}) {
  return dependencies.fallback ?? localGenerationTaskCache;
}

export function loadGenerationTaskHistoryFallback(
  dependencies: GenerationTaskHistoryFallbackDependencies = {}
): GenerationTask[] {
  return getFallback(dependencies).loadSync();
}

export function cacheGenerationTaskHistoryFallback(
  tasks: GenerationTask[],
  limit = defaultMaxStoredGenerationTasks,
  dependencies: GenerationTaskHistoryFallbackDependencies = {}
) {
  getFallback(dependencies).save(createPersistableGenerationTaskHistorySnapshot(tasks, limit));
}

export function shouldPersistGenerationTaskHistory(tasks: readonly GenerationTask[]): boolean {
  return !tasks.some((task) => isActiveGenerationStatus(task.status));
}
