import type { BatchGenerationItem, GeneratedImage, GenerationTask } from '../../src/domain/generationTask';

interface LiveGenerationImageAsset {
  id: string;
  mimeType: string;
  bytes: Buffer;
  createdAt: number;
  expiresAt: number;
}

const LIVE_IMAGE_TTL_MS = 10 * 60_000;
const LIVE_IMAGE_MAX_ITEMS = 160;
const liveImageAssets = new Map<string, LiveGenerationImageAsset>();
const liveImageIdsBySource = new Map<string, string>();

function cleanupLiveImages(now = Date.now()) {
  for (const [id, asset] of liveImageAssets) {
    if (asset.expiresAt <= now) liveImageAssets.delete(id);
  }

  while (liveImageAssets.size > LIVE_IMAGE_MAX_ITEMS) {
    const oldest = [...liveImageAssets.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
    if (!oldest) break;
    liveImageAssets.delete(oldest.id);
  }

  const activeIds = new Set(liveImageAssets.keys());
  for (const [sourceId, liveId] of liveImageIdsBySource) {
    if (!activeIds.has(liveId)) liveImageIdsBySource.delete(sourceId);
  }
}

function parseImageDataUrl(src: string): { mimeType: string; bytes: Buffer } | null {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(src);
  if (!match) return null;
  try {
    return {
      mimeType: match[1] || 'image/png',
      bytes: Buffer.from(match[2], 'base64')
    };
  } catch {
    return null;
  }
}

function registerLiveImageSource(sourceId: string, src: string): LiveGenerationImageAsset | null {
  const parsed = parseImageDataUrl(src);
  if (!parsed) return null;

  const now = Date.now();
  cleanupLiveImages(now);

  const id = liveImageIdsBySource.get(sourceId) ?? crypto.randomUUID();
  liveImageIdsBySource.set(sourceId, id);
  const asset: LiveGenerationImageAsset = {
    id,
    mimeType: parsed.mimeType,
    bytes: parsed.bytes,
    createdAt: now,
    expiresAt: now + LIVE_IMAGE_TTL_MS
  };
  liveImageAssets.set(id, asset);
  return asset;
}

function liveImageUrl(asset: LiveGenerationImageAsset): string {
  return `/api/generation-tasks/live-images/${encodeURIComponent(asset.id)}`;
}

function serializeGeneratedImageForClient(image: GeneratedImage): GeneratedImage {
  if (typeof image.src !== 'string' || !image.src.startsWith('data:image/')) return image;
  const asset = registerLiveImageSource(image.id, image.src);
  if (!asset) return image;
  return {
    ...image,
    src: liveImageUrl(asset),
    thumbnailSrc: typeof image.thumbnailSrc === 'string' && image.thumbnailSrc.startsWith('data:image/') ? liveImageUrl(asset) : image.thumbnailSrc
  };
}

function serializeBatchItemForClient(item: BatchGenerationItem): BatchGenerationItem {
  if (!item.images.some((image) => typeof image.src === 'string' && image.src.startsWith('data:image/'))) return item;
  return {
    ...item,
    images: item.images.map(serializeGeneratedImageForClient)
  };
}

export function serializeLiveGenerationTaskImagesForClient(task: GenerationTask): GenerationTask {
  const hasTopLevelLiveImages = task.images.some((image) => typeof image.src === 'string' && image.src.startsWith('data:image/'));
  const hasBatchLiveImages = task.batch?.items.some((item) => item.images.some((image) => typeof image.src === 'string' && image.src.startsWith('data:image/'))) ?? false;
  if (!hasTopLevelLiveImages && !hasBatchLiveImages) return task;

  return {
    ...task,
    images: hasTopLevelLiveImages ? task.images.map(serializeGeneratedImageForClient) : task.images,
    batch: task.batch ? {
      ...task.batch,
      items: hasBatchLiveImages ? task.batch.items.map(serializeBatchItemForClient) : task.batch.items
    } : task.batch
  };
}

export function getLiveGenerationImageAsset(id: string): LiveGenerationImageAsset | null {
  cleanupLiveImages();
  return liveImageAssets.get(id) ?? null;
}
