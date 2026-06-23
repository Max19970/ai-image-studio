import type { GeneratedImage, GenerationTask } from '../../domain/generationTask';
import { loadGenerationTaskAsset } from '../../infrastructure/storage/remoteGenerationTaskHistoryStore';
import { createOptimizedThumbnail } from '../../shared/image';

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

async function mapTaskImages(
  task: GenerationTask,
  recipe: (image: GeneratedImage) => Promise<GeneratedImage>
): Promise<GenerationTask> {
  return {
    ...task,
    images: await Promise.all(task.images.map(recipe)),
    batch: task.batch ? {
      ...task.batch,
      items: await Promise.all(task.batch.items.map(async (item) => ({
        ...item,
        images: await Promise.all(item.images.map(recipe))
      })))
    } : undefined
  };
}

export function withGeneratedImageFullAssets(tasks: GenerationTask[]): Promise<GenerationTask[]> {
  return Promise.all(tasks.map((task) => mapTaskImages(task, withGeneratedImageFullAsset)));
}

async function withGeneratedImageThumbnail(image: GeneratedImage): Promise<GeneratedImage> {
  if (image.thumbnailSrc || image.kind === 'partial') return image;
  const thumbnailSrc = await createOptimizedThumbnail(image.src, 520, 0.82);
  return thumbnailSrc ? { ...image, thumbnailSrc } : image;
}

export function withGeneratedImageThumbnails(tasks: GenerationTask[]): Promise<GenerationTask[]> {
  return Promise.all(tasks.map((task) => mapTaskImages(task, withGeneratedImageThumbnail)));
}
