import { normalizeGalleryPaths } from '../../src/domain/galleryFilesystem';
import type { GeneratedImage, GenerationTask } from '../../src/domain/generationTask';
import { uid } from '../processes/generation-task-runtime/imageState';

export interface GalleryTaskCopyDependencies {
  now(): number;
  nextId(kind: 'task' | 'batch-item' | 'image'): string;
}

const defaultDependencies: GalleryTaskCopyDependencies = {
  now: () => Date.now(),
  nextId: (kind) => uid(kind)
};

function taskImages(task: GenerationTask): GeneratedImage[] {
  return [
    ...task.images,
    ...(task.batch?.items.flatMap((item) => item.images) ?? [])
  ];
}

export function generationTaskNeedsFullAssetsForCopy(task: GenerationTask): boolean {
  return taskImages(task).some((image) => Boolean(image.storageAssetKey) && (image.storageAssetLoaded === false || !image.src));
}

function assertFullAssetsAvailable(task: GenerationTask): void {
  if (generationTaskNeedsFullAssetsForCopy(task)) {
    throw new Error('Full generation assets must be loaded before copying a gallery task.');
  }
}

function prepareCopiedImage(
  image: GeneratedImage,
  taskId: string,
  nextId: GalleryTaskCopyDependencies['nextId'],
  batchItemId?: string
): GeneratedImage {
  return {
    ...image,
    id: nextId('image'),
    taskId,
    batchItemId: batchItemId ?? image.batchItemId,
    storageAssetKey: undefined,
    storageThumbnailKey: undefined,
    storageAssetLoaded: undefined
  };
}

export function cloneGenerationTaskForGalleryCopy(
  task: GenerationTask,
  targetPath: string,
  dependencies: Partial<GalleryTaskCopyDependencies> = {}
): GenerationTask {
  assertFullAssetsAvailable(task);
  const now = dependencies.now ?? defaultDependencies.now;
  const nextId = dependencies.nextId ?? defaultDependencies.nextId;
  const copy = structuredClone(task);
  const taskId = nextId('task');
  const createdAt = now();
  const batchIdMap = new Map<string, string>();

  if (copy.batch) {
    copy.batch.items = copy.batch.items.map((item) => {
      const nextItemId = nextId('batch-item');
      batchIdMap.set(item.id, nextItemId);
      return {
        ...item,
        id: nextItemId,
        images: item.images.map((image) => prepareCopiedImage(image, taskId, nextId, nextItemId))
      };
    });
  }

  const galleryPaths = normalizeGalleryPaths(undefined, targetPath);
  return {
    ...copy,
    id: taskId,
    createdAt,
    updatedAt: createdAt,
    galleryPath: galleryPaths[0] ?? '/',
    galleryPaths,
    images: copy.images.map((image) => prepareCopiedImage(
      image,
      taskId,
      nextId,
      image.batchItemId ? batchIdMap.get(image.batchItemId) : undefined
    ))
  };
}
