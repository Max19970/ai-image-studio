import { useEffect, useMemo, useState } from 'react';
import type { GeneratedImage, GenerationTask } from '../../../domain/generationTask';
import { loadGenerationTaskAsset } from '../../../infrastructure/storage/remoteGenerationTaskHistoryStore';

function needsFullAsset(image: GeneratedImage | null | undefined): image is GeneratedImage & { storageAssetKey: string } {
  return Boolean(image?.storageAssetKey && image.storageAssetLoaded === false);
}

function mergeLoadedImage(source: GeneratedImage, loaded: GeneratedImage): GeneratedImage {
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

function hydrateImage(image: GeneratedImage, loadedByKey: Record<string, GeneratedImage>): GeneratedImage {
  const loaded = image.storageAssetKey ? loadedByKey[image.storageAssetKey] : undefined;
  return loaded ? mergeLoadedImage(image, loaded) : image;
}

function hydrateTask(task: GenerationTask, loadedByKey: Record<string, GeneratedImage>): GenerationTask {
  return {
    ...task,
    images: task.images.map((image) => hydrateImage(image, loadedByKey)),
    batch: task.batch ? {
      ...task.batch,
      items: task.batch.items.map((item) => ({
        ...item,
        images: item.images.map((image) => hydrateImage(image, loadedByKey))
      }))
    } : undefined
  };
}

export function useHydratedDetailAssets(task: GenerationTask, activeImage: GeneratedImage | null) {
  const [loadedByKey, setLoadedByKey] = useState<Record<string, GeneratedImage>>({});

  useEffect(() => {
    if (!needsFullAsset(activeImage) || loadedByKey[activeImage.storageAssetKey]) return;
    let cancelled = false;

    loadGenerationTaskAsset(activeImage.storageAssetKey)
      .then((loaded) => {
        if (cancelled || !loaded) return;
        setLoadedByKey((current) => ({ ...current, [activeImage.storageAssetKey]: loaded }));
      })
      .catch((error) => {
        console.warn('Could not lazy-load full generation asset.', error);
      });

    return () => {
      cancelled = true;
    };
  }, [activeImage?.storageAssetKey, activeImage?.storageAssetLoaded, loadedByKey]);

  const hydratedTask = useMemo(() => hydrateTask(task, loadedByKey), [task, loadedByKey]);
  const hydratedActiveImage = useMemo(() => {
    if (!activeImage) return null;
    return hydrateImage(activeImage, loadedByKey);
  }, [activeImage, loadedByKey]);

  return { task: hydratedTask, activeImage: hydratedActiveImage };
}
