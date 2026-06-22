import type { GenerationTaskAssetMode } from '../storage/generationTaskStore';

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function storedAssetImageUrl(key: string): string {
  return `/api/storage/generation-task-asset/image?key=${encodeURIComponent(key)}`;
}

function serializeStoredImageForClient(image: unknown, assetMode: GenerationTaskAssetMode): unknown {
  if (!isRecord(image)) return image;
  if (assetMode !== 'thumbnail') return image;

  const storageAssetKey = typeof image.storageAssetKey === 'string' ? image.storageAssetKey : '';
  const storageThumbnailKey = typeof image.storageThumbnailKey === 'string' ? image.storageThumbnailKey : '';
  const displayKey = storageThumbnailKey || storageAssetKey;
  if (!displayKey) return image;

  const displayUrl = storedAssetImageUrl(displayKey);
  return {
    ...image,
    src: displayUrl,
    thumbnailSrc: displayUrl,
    storageAssetLoaded: false
  };
}

function serializeBatchItemForClient(item: unknown, assetMode: GenerationTaskAssetMode): unknown {
  if (!isRecord(item) || !Array.isArray(item.images)) return item;
  return {
    ...item,
    images: item.images.map((image) => serializeStoredImageForClient(image, assetMode))
  };
}

export function serializeGenerationTaskHistoryForClient(tasks: unknown[], assetMode: GenerationTaskAssetMode): unknown[] {
  if (assetMode !== 'thumbnail') return tasks;

  return tasks.map((task) => {
    if (!isRecord(task)) return task;
    return {
      ...task,
      images: Array.isArray(task.images) ? task.images.map((image) => serializeStoredImageForClient(image, assetMode)) : task.images,
      batch: isRecord(task.batch) && Array.isArray(task.batch.items) ? {
        ...task.batch,
        items: task.batch.items.map((item: unknown) => serializeBatchItemForClient(item, assetMode))
      } : task.batch
    };
  });
}
