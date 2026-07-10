import type { AssetRow, GenerationTaskAssetMode, JsonObject, StoredImageReference } from './types';

export function isRecord(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback;
}

export function numberOrFallback(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function clampLimit(value: unknown, fallback = 1000): number {
  const numeric = Math.floor(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(10000, Math.max(1, numeric));
}

export function clampOffset(value: unknown): number {
  const numeric = Math.floor(Number(value));
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
}

function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/[^;,]+;base64,/i.test(value);
}

function estimateImageBytes(image: JsonObject): number {
  const src = typeof image.src === 'string' ? image.src : '';
  const comma = src.indexOf(',');
  if (isImageDataUrl(src) && comma >= 0) return Math.floor((src.length - comma - 1) * 0.75);
  return 0;
}

function imageFormatFromDataUrl(src: string, fallback: string): string {
  const match = /^data:image\/([^;,]+)/.exec(src);
  return match?.[1] ?? fallback;
}

function cloneDocumentImage(image: unknown): JsonObject | null {
  if (!isRecord(image)) return null;
  const src = typeof image.src === 'string' ? image.src : '';
  if (!src || isImageDataUrl(src)) return null;
  const cloned = structuredClone(image) as JsonObject;
  cloned.raw = undefined;
  if (isImageDataUrl(cloned.thumbnailSrc)) cloned.thumbnailSrc = undefined;
  return cloned;
}

function cloneDocumentImages(images: unknown): JsonObject[] {
  return Array.isArray(images) ? images.flatMap((image) => {
    const cloned = cloneDocumentImage(image);
    return cloned ? [cloned] : [];
  }) : [];
}

export function cloneWithoutImages(task: JsonObject): JsonObject {
  const document = structuredClone(task) as JsonObject;
  document.images = cloneDocumentImages(document.images);
  if (isRecord(document.batch) && Array.isArray(document.batch.items)) {
    document.batch.items = document.batch.items.map((item: unknown) => {
      if (!isRecord(item)) return item;
      return { ...item, images: cloneDocumentImages(item.images) };
    });
  }
  return document;
}

function createThumbnailDocument(image: JsonObject, src: string, storageAssetKey: string, storageThumbnailKey: string): JsonObject {
  return { ...image, src, thumbnailSrc: src, storageAssetKey, storageThumbnailKey, storageAssetLoaded: false, raw: undefined };
}

function collectTopLevelImageRefs(task: JsonObject, taskId: string): StoredImageReference[] {
  const topLevelImages = Array.isArray(task.images) ? task.images : [];
  return topLevelImages.flatMap((image, index) => {
    if (!isRecord(image)) return [];
    const imageSrc = typeof image.src === 'string' ? image.src : '';
    if (!isImageDataUrl(imageSrc)) return [];
    const imageId = stringOrFallback(image.id, `${taskId}-image-${index}`);
    const imageIndex = numberOrFallback(image.index, index);
    const format = stringOrFallback(image.format, 'png');
    const fullDocumentKey = `${taskId}/image/${imageId}/full`;
    const refs: StoredImageReference[] = [{
      documentKey: fullDocumentKey,
      taskId,
      imageId,
      batchItemId: null,
      batchItemIndex: null,
      imageIndex,
      assetKind: 'full',
      imageKind: stringOrFallback(image.kind, 'final'),
      format,
      createdAt: numberOrFallback(image.createdAt, Date.now()),
      bytes: estimateImageBytes(image),
      document: { ...image, id: imageId, storageAssetKey: fullDocumentKey, storageAssetLoaded: true }
    }];

    if (isImageDataUrl(image.thumbnailSrc)) {
      const thumbnailDocumentKey = `${taskId}/image/${imageId}/thumbnail`;
      const thumbnailDocument = createThumbnailDocument(image, image.thumbnailSrc, fullDocumentKey, thumbnailDocumentKey);
      refs.push({
        documentKey: thumbnailDocumentKey,
        taskId,
        imageId,
        batchItemId: null,
        batchItemIndex: null,
        imageIndex,
        assetKind: 'thumbnail',
        imageKind: stringOrFallback(image.kind, 'final'),
        format: imageFormatFromDataUrl(image.thumbnailSrc, 'webp'),
        createdAt: numberOrFallback(image.createdAt, Date.now()),
        bytes: estimateImageBytes(thumbnailDocument),
        document: thumbnailDocument
      });
    }
    return refs;
  });
}

function collectBatchImageRefs(task: JsonObject, taskId: string): StoredImageReference[] {
  const batchItems = isRecord(task.batch) && Array.isArray(task.batch.items) ? task.batch.items : [];
  return batchItems.flatMap((item, itemIndex) => {
    if (!isRecord(item) || !Array.isArray(item.images)) return [];
    const batchItemId = stringOrFallback(item.id, `${taskId}-batch-item-${itemIndex}`);
    return item.images.flatMap((image, imageIndex) => {
      if (!isRecord(image)) return [];
      const imageSrc = typeof image.src === 'string' ? image.src : '';
      if (!isImageDataUrl(imageSrc)) return [];
      const imageId = stringOrFallback(image.id, `${batchItemId}-image-${imageIndex}`);
      const storedIndex = numberOrFallback(image.index, imageIndex);
      const format = stringOrFallback(image.format, 'png');
      const fullDocumentKey = `${taskId}/batch/${batchItemId}/image/${imageId}/full`;
      const refs: StoredImageReference[] = [{
        documentKey: fullDocumentKey,
        taskId,
        imageId,
        batchItemId,
        batchItemIndex: numberOrFallback(item.index, itemIndex),
        imageIndex: storedIndex,
        assetKind: 'full',
        imageKind: stringOrFallback(image.kind, 'final'),
        format,
        createdAt: numberOrFallback(image.createdAt, Date.now()),
        bytes: estimateImageBytes(image),
        document: { ...image, id: imageId, storageAssetKey: fullDocumentKey, storageAssetLoaded: true }
      }];

      if (isImageDataUrl(image.thumbnailSrc)) {
        const thumbnailDocumentKey = `${taskId}/batch/${batchItemId}/image/${imageId}/thumbnail`;
        const thumbnailDocument = createThumbnailDocument(image, image.thumbnailSrc, fullDocumentKey, thumbnailDocumentKey);
        refs.push({
          documentKey: thumbnailDocumentKey,
          taskId,
          imageId,
          batchItemId,
          batchItemIndex: numberOrFallback(item.index, itemIndex),
          imageIndex: storedIndex,
          assetKind: 'thumbnail',
          imageKind: stringOrFallback(image.kind, 'final'),
          format: imageFormatFromDataUrl(image.thumbnailSrc, 'webp'),
          createdAt: numberOrFallback(image.createdAt, Date.now()),
          bytes: estimateImageBytes(thumbnailDocument),
          document: thumbnailDocument
        });
      }
      return refs;
    });
  });
}

export function collectImages(task: JsonObject, taskId: string): StoredImageReference[] {
  return [...collectTopLevelImageRefs(task, taskId), ...collectBatchImageRefs(task, taskId)];
}

function createMetadataImage(asset: AssetRow, thumbnail?: AssetRow): JsonObject {
  return {
    id: asset.image_id,
    src: '',
    format: asset.format,
    kind: 'final',
    index: asset.image_index,
    createdAt: asset.created_at,
    batchItemId: asset.batch_item_id ?? undefined,
    storageAssetKey: asset.document_key,
    storageThumbnailKey: thumbnail?.document_key,
    storageAssetLoaded: false
  };
}

export function createImageFromAssetDocuments(
  asset: AssetRow,
  thumbnail: AssetRow | undefined,
  assetMode: GenerationTaskAssetMode,
  loadDocument: (documentKey: string) => JsonObject | null
): JsonObject | null {
  if (assetMode === 'metadata') return createMetadataImage(asset, thumbnail);

  if (assetMode === 'thumbnail') {
    const thumb = thumbnail ? loadDocument(thumbnail.document_key) : null;
    if (thumb) return { ...thumb, storageAssetKey: asset.document_key, storageThumbnailKey: thumbnail?.document_key, storageAssetLoaded: false };
  }

  const full = loadDocument(asset.document_key);
  if (!full) return null;
  const thumb = thumbnail ? loadDocument(thumbnail.document_key) : null;
  return {
    ...full,
    thumbnailSrc: typeof thumb?.src === 'string' ? thumb.src : full.thumbnailSrc,
    storageAssetKey: asset.document_key,
    storageThumbnailKey: thumbnail?.document_key,
    storageAssetLoaded: true
  };
}

export function restoreTaskImages(
  task: JsonObject,
  assetRows: AssetRow[],
  assetMode: GenerationTaskAssetMode,
  loadDocument: (documentKey: string) => JsonObject | null
): JsonObject {
  task.images = cloneDocumentImages(task.images);
  if (isRecord(task.batch) && Array.isArray(task.batch.items)) {
    task.batch.items = task.batch.items.map((item: unknown) => isRecord(item) ? { ...item, images: cloneDocumentImages(item.images) } : item);
  }

  const thumbnailByImage = new Map<string, AssetRow>();
  assetRows.filter((asset) => asset.kind === 'thumbnail').forEach((thumbnail) => {
    thumbnailByImage.set(`${thumbnail.batch_item_id ?? 'root'}:${thumbnail.image_id}`, thumbnail);
  });

  assetRows.filter((asset) => asset.kind === 'full').forEach((asset) => {
    const thumbnail = thumbnailByImage.get(`${asset.batch_item_id ?? 'root'}:${asset.image_id}`);
    const image = createImageFromAssetDocuments(asset, thumbnail, assetMode, loadDocument);
    if (!image) return;

    if (asset.batch_item_id) {
      const batchItems = isRecord(task.batch) && Array.isArray(task.batch.items) ? task.batch.items : [];
      const item = batchItems.find((candidate: unknown) => isRecord(candidate) && candidate.id === asset.batch_item_id);
      if (isRecord(item)) item.images = [...(Array.isArray(item.images) ? item.images : []), image];
      return;
    }

    if (Array.isArray(task.images)) task.images.push(image);
  });

  return task;
}
