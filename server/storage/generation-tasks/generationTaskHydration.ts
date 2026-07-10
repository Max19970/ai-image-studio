import { isRecord } from './generationTaskCodecs';
import { loadGenerationTaskAssetDocument } from './generationTaskAssets';
import type { JsonObject } from './types';

function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/[^;,]+;base64,/i.test(value);
}

function hydrateImageForPersistence(image: unknown): unknown {
  if (!isRecord(image)) return image;
  const fullKey = typeof image.storageAssetKey === 'string' ? image.storageAssetKey : '';
  const thumbnailKey = typeof image.storageThumbnailKey === 'string' ? image.storageThumbnailKey : '';
  const full = fullKey ? loadGenerationTaskAssetDocument(fullKey) : null;
  const thumbnail = thumbnailKey ? loadGenerationTaskAssetDocument(thumbnailKey) : null;
  const fullSrc = isImageDataUrl(image.src) ? image.src : isImageDataUrl(full?.src) ? full.src : '';
  const thumbnailSrc = isImageDataUrl(image.thumbnailSrc)
    ? image.thumbnailSrc
    : isImageDataUrl(thumbnail?.src)
      ? thumbnail.src
      : isImageDataUrl(full?.thumbnailSrc)
        ? full.thumbnailSrc
        : '';

  return {
    ...image,
    ...(fullSrc ? { src: fullSrc } : {}),
    ...(thumbnailSrc ? { thumbnailSrc } : {}),
    ...(fullKey ? { storageAssetKey: fullKey } : {}),
    ...(thumbnailKey ? { storageThumbnailKey: thumbnailKey } : {})
  };
}

export function hydrateTaskForPersistence(task: JsonObject): JsonObject {
  return {
    ...task,
    images: Array.isArray(task.images) ? task.images.map(hydrateImageForPersistence) : task.images,
    batch: isRecord(task.batch) && Array.isArray(task.batch.items) ? {
      ...task.batch,
      items: task.batch.items.map((item: unknown) => isRecord(item) ? {
        ...item,
        images: Array.isArray(item.images) ? item.images.map(hydrateImageForPersistence) : item.images
      } : item)
    } : task.batch
  };
}
