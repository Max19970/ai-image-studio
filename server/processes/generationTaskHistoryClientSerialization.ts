import type { GenerationTaskAssetMode } from '../storage/generationTaskStore';

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

const inlineImageRawKeys = new Set(['b64_json', 'partial_image_b64', 'result']);

function storedAssetImageUrl(key: string): string {
  return `/api/storage/generation-task-asset/image?key=${encodeURIComponent(key)}`;
}

function compactInlineImageRaw(value: unknown, depth = 0): unknown {
  if (!value || typeof value !== 'object' || depth > 6) return value;
  if (Array.isArray(value)) return value.map((item) => compactInlineImageRaw(item, depth + 1));

  const compacted: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    compacted[key] = inlineImageRawKeys.has(key) && typeof entry === 'string'
      ? `[omitted inline image payload: ${entry.length} chars]`
      : compactInlineImageRaw(entry, depth + 1);
  });
  return compacted;
}

function serializeStoredImageForClient(image: unknown, assetMode: GenerationTaskAssetMode): unknown {
  if (!isRecord(image)) return image;
  const compacted: Record<string, any> = { ...image, raw: compactInlineImageRaw(image.raw) };
  if (assetMode !== 'thumbnail') return compacted;

  const storageAssetKey = typeof compacted.storageAssetKey === 'string' ? compacted.storageAssetKey : '';
  const storageThumbnailKey = typeof compacted.storageThumbnailKey === 'string' ? compacted.storageThumbnailKey : '';
  const displayKey = storageThumbnailKey || storageAssetKey;
  if (!displayKey) return compacted;

  const displayUrl = storedAssetImageUrl(displayKey);
  return {
    ...compacted,
    src: displayUrl,
    thumbnailSrc: displayUrl,
    storageAssetLoaded: false
  };
}

function serializeBatchItemForClient(item: unknown, assetMode: GenerationTaskAssetMode): unknown {
  if (!isRecord(item)) return item;
  return {
    ...item,
    raw: compactInlineImageRaw(item.raw),
    images: Array.isArray(item.images) ? item.images.map((image) => serializeStoredImageForClient(image, assetMode)) : item.images
  };
}

export function serializeGenerationTaskHistoryForClient(tasks: unknown[], assetMode: GenerationTaskAssetMode): unknown[] {
  return tasks.map((task) => {
    if (!isRecord(task)) return task;
    return {
      ...task,
      raw: compactInlineImageRaw(task.raw),
      images: Array.isArray(task.images) ? task.images.map((image) => serializeStoredImageForClient(image, assetMode)) : task.images,
      batch: isRecord(task.batch) && Array.isArray(task.batch.items) ? {
        ...task.batch,
        items: task.batch.items.map((item: unknown) => serializeBatchItemForClient(item, assetMode))
      } : task.batch
    };
  });
}
