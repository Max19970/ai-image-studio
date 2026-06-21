import type { GeneratedImage, GenerationTask } from '../../domain/generationTask';
import { isActiveGenerationStatus } from '../../domain/generationStatus';
import type { GenerationTaskHistoryCache, GenerationTaskHistoryStore } from '../../entities/storage';
import { normalizeGenerationTasks } from '../../entities/storage';
import { localGenerationTaskCache } from '../../infrastructure/storage/localGenerationTaskCache';
import { loadGenerationTaskAsset, remoteGenerationTaskHistoryStore } from '../../infrastructure/storage/remoteGenerationTaskHistoryStore';
import { createOptimizedThumbnail } from '../../shared/image';

export interface GenerationTaskHistorySyncDependencies {
  remote?: GenerationTaskHistoryStore;
  fallback?: GenerationTaskHistoryCache;
}

let latestHistorySaveRevision = 0;
let historySaveQueue: Promise<void> = Promise.resolve();

function imageHasPersistableAsset(image: GeneratedImage): boolean {
  return image.kind !== 'partial' && Boolean(image.src || image.storageAssetKey);
}

function taskHasPersistableImage(task: GenerationTask): boolean {
  if (task.images.some(imageHasPersistableAsset)) return true;
  return Boolean(task.batch?.items.some((item) => item.images.some(imageHasPersistableAsset)));
}

function imageSignature(image: GeneratedImage): string {
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
  return normalizeGenerationTasks(
    tasks.filter((task) => !isActiveGenerationStatus(task.status) || taskHasPersistableImage(task)),
    120
  );
}

export function getGenerationTaskHistoryPersistenceSignature(tasks: readonly GenerationTask[]): string {
  return JSON.stringify(tasks.map((task) => ({
    id: task.id,
    status: task.status,
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

function shouldLoadFullAsset(image: GeneratedImage): image is GeneratedImage & { storageAssetKey: string } {
  return Boolean(image.storageAssetKey && image.storageAssetLoaded === false);
}

function mergeLoadedAssetImage(source: GeneratedImage, loaded: GeneratedImage): GeneratedImage {
  return {
    ...source,
    ...loaded,
    id: source.id,
    taskId: source.taskId ?? loaded.taskId,
    batchItemId: source.batchItemId ?? loaded.batchItemId,
    batchItemIndex: source.batchItemIndex ?? loaded.batchItemIndex,
    index: source.index,
    request: loaded.request ?? source.request,
    thumbnailSrc: source.thumbnailSrc ?? loaded.thumbnailSrc,
    storageAssetKey: source.storageAssetKey ?? loaded.storageAssetKey,
    storageThumbnailKey: source.storageThumbnailKey ?? loaded.storageThumbnailKey,
    storageAssetLoaded: true
  };
}

async function withGeneratedImageFullAsset(image: GeneratedImage): Promise<GeneratedImage> {
  if (!shouldLoadFullAsset(image)) return image;
  const loaded = await loadGenerationTaskAsset(image.storageAssetKey);
  return loaded ? mergeLoadedAssetImage(image, loaded) : image;
}

async function withGeneratedImageFullAssets(tasks: GenerationTask[]): Promise<GenerationTask[]> {
  return Promise.all(tasks.map(async (task) => ({
    ...task,
    images: await Promise.all(task.images.map(withGeneratedImageFullAsset)),
    batch: task.batch ? {
      ...task.batch,
      items: await Promise.all(task.batch.items.map(async (item) => ({
        ...item,
        images: await Promise.all(item.images.map(withGeneratedImageFullAsset))
      })))
    } : undefined
  })));
}

async function withGeneratedImageThumbnail(image: GeneratedImage): Promise<GeneratedImage> {
  if (image.thumbnailSrc || image.kind === 'partial') return image;
  const thumbnailSrc = await createOptimizedThumbnail(image.src, 520, 0.82);
  return thumbnailSrc ? { ...image, thumbnailSrc } : image;
}

async function withGeneratedImageThumbnails(tasks: GenerationTask[]): Promise<GenerationTask[]> {
  return Promise.all(tasks.map(async (task) => ({
    ...task,
    images: await Promise.all(task.images.map(withGeneratedImageThumbnail)),
    batch: task.batch ? {
      ...task.batch,
      items: await Promise.all(task.batch.items.map(async (item) => ({
        ...item,
        images: await Promise.all(item.images.map(withGeneratedImageThumbnail))
      })))
    } : undefined
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

export async function loadGenerationTaskHistory(dependencies: GenerationTaskHistorySyncDependencies = {}): Promise<GenerationTask[]> {
  const { remote, fallback } = getSyncStores(dependencies);
  try {
    const result = await remote.load({ limit: 120, offset: 0, assetMode: 'thumbnail' });
    return normalizeGenerationTasks(result.value, 120);
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
  const safeTasks = tasks;
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
  const safeTasks = normalizeGenerationTasks(tasks, 120);

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
