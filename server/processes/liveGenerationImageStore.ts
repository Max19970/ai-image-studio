import type { BatchGenerationItem, GeneratedImage, GenerationTask } from '../../src/domain/generationTask';
import {
  createLiveGenerationImageStore,
  type LiveGenerationImageAsset,
  type LiveGenerationImageStore
} from './liveGenerationImageAssets';

const defaultLiveGenerationImageStore = createLiveGenerationImageStore();

function serializeGeneratedImageForClient(image: GeneratedImage, store: LiveGenerationImageStore): GeneratedImage {
  if (typeof image.src !== 'string' || !image.src.startsWith('data:image/')) return image;
  const asset = store.registerSource(image.id, image.src);
  if (!asset) return image;
  return {
    ...image,
    src: store.urlFor(asset),
    thumbnailSrc: typeof image.thumbnailSrc === 'string' && image.thumbnailSrc.startsWith('data:image/') ? store.urlFor(asset) : image.thumbnailSrc
  };
}

function serializeBatchItemForClient(item: BatchGenerationItem, store: LiveGenerationImageStore): BatchGenerationItem {
  if (!item.images.some((image) => typeof image.src === 'string' && image.src.startsWith('data:image/'))) return item;
  return {
    ...item,
    images: item.images.map((image) => serializeGeneratedImageForClient(image, store))
  };
}

export function serializeLiveGenerationTaskImagesForClient(
  task: GenerationTask,
  store: LiveGenerationImageStore = defaultLiveGenerationImageStore
): GenerationTask {
  const hasTopLevelLiveImages = task.images.some((image) => typeof image.src === 'string' && image.src.startsWith('data:image/'));
  const hasBatchLiveImages = task.batch?.items.some((item) => item.images.some((image) => typeof image.src === 'string' && image.src.startsWith('data:image/'))) ?? false;
  if (!hasTopLevelLiveImages && !hasBatchLiveImages) return task;

  return {
    ...task,
    images: hasTopLevelLiveImages ? task.images.map((image) => serializeGeneratedImageForClient(image, store)) : task.images,
    batch: task.batch ? {
      ...task.batch,
      items: hasBatchLiveImages ? task.batch.items.map((item) => serializeBatchItemForClient(item, store)) : task.batch.items
    } : task.batch
  };
}

export function getLiveGenerationImageAsset(id: string): LiveGenerationImageAsset | null {
  return defaultLiveGenerationImageStore.getAsset(id);
}

export function resetLiveGenerationImageStoreForTests() {
  defaultLiveGenerationImageStore.reset();
}
