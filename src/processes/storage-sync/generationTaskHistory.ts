import type { GenerationTask } from '../../domain/generationTask';
import { isActiveGenerationStatus } from '../../domain/generationStatus';
import type { GenerationTaskHistoryCache, GenerationTaskHistoryStore } from '../../entities/storage';
import { normalizeGenerationTasks, toPersistableGenerationTaskSnapshot } from '../../entities/storage';
import { localGenerationTaskCache } from '../../infrastructure/storage/localGenerationTaskCache';
import { remoteGenerationTaskHistoryStore } from '../../infrastructure/storage/remoteGenerationTaskHistoryStore';
import { withGeneratedImageFullAssets, withGeneratedImageThumbnails } from './generationTaskAssets';
// Thumbnail creation still happens before persistence; generationTaskAssets owns the createOptimizedThumbnail call.

export interface GenerationTaskHistorySyncDependencies {
  remote?: GenerationTaskHistoryStore;
  fallback?: GenerationTaskHistoryCache;
}

let latestHistorySaveRevision = 0;
let historySaveQueue: Promise<void> = Promise.resolve();

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

export function createPersistableGenerationTaskHistorySnapshot(tasks: GenerationTask[]): GenerationTask[] {
  return toPersistableGenerationTaskSnapshot(tasks, 120);
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

function getSyncStores(dependencies: GenerationTaskHistorySyncDependencies = {}) {
  return {
    remote: dependencies.remote ?? remoteGenerationTaskHistoryStore,
    fallback: dependencies.fallback ?? localGenerationTaskCache
  };
}

export function loadGenerationTaskHistoryFallback(dependencies: GenerationTaskHistorySyncDependencies = {}): GenerationTask[] {
  return getSyncStores(dependencies).fallback.loadSync();
}

export function cacheGenerationTaskHistoryFallback(tasks: GenerationTask[], dependencies: GenerationTaskHistorySyncDependencies = {}) {
  getSyncStores(dependencies).fallback.save(createPersistableGenerationTaskHistorySnapshot(tasks));
}

export async function loadGenerationTaskHistory(dependencies: GenerationTaskHistorySyncDependencies = {}): Promise<GenerationTask[]> {
  const { remote, fallback } = getSyncStores(dependencies);
  try {
    const result = await remote.load({ limit: 120, offset: 0, assetMode: 'thumbnail' });
    const normalized = normalizeGenerationTasks(result.value, 120);
    fallback.save(createPersistableGenerationTaskHistorySnapshot(normalized));
    return normalized;
  } catch (error) {
    console.warn('Falling back to local generation history cache.', error);
    return fallback.loadSync();
  }
}

export function shouldPersistGenerationTaskHistory(tasks: readonly GenerationTask[]): boolean {
  return !tasks.some((task) => isActiveGenerationStatus(task.status));
}

async function saveGenerationTaskHistoryNow(tasks: GenerationTask[], dependencies: GenerationTaskHistorySyncDependencies = {}): Promise<void> {
  const { remote, fallback } = getSyncStores(dependencies);
  const safeTasks = createPersistableGenerationTaskHistorySnapshot(tasks);
  try {
    const tasksWithFullAssets = await withGeneratedImageFullAssets(safeTasks);
    const tasksWithThumbnails = await withGeneratedImageThumbnails(tasksWithFullAssets);
    await remote.save(tasksWithThumbnails);
    fallback.save(tasksWithThumbnails);
  } catch (error) {
    console.warn('Could not persist generation history to the encrypted database. Using local fallback cache.', error);
    fallback.save(safeTasks);
  }
}

export function saveGenerationTaskHistory(tasks: GenerationTask[], dependencies: GenerationTaskHistorySyncDependencies = {}): Promise<void> {
  const revision = ++latestHistorySaveRevision;
  const safeTasks = createPersistableGenerationTaskHistorySnapshot(tasks);

  historySaveQueue = historySaveQueue
    .catch(() => undefined)
    .then(async () => {
      if (revision !== latestHistorySaveRevision) return;
      await saveGenerationTaskHistoryNow(safeTasks, dependencies);
    });

  return historySaveQueue;
}

export async function clearGenerationTaskHistory(dependencies: GenerationTaskHistorySyncDependencies = {}): Promise<void> {
  const { remote, fallback } = getSyncStores(dependencies);
  try {
    await remote.clear();
  } catch (error) {
    console.warn('Could not clear encrypted generation history database.', error);
  } finally {
    fallback.clear();
  }
}
