import { addGalleryPath, mapGallerySubPath, normalizeGalleryPath, normalizeGalleryPaths } from '../../../src/domain/galleryFilesystem';
import type { GeneratedImage, GenerationTask } from '../../../src/domain/generationTask';
import { uid } from './imageState';
import { mutateTasks, patchTask } from './runtimeStore';

function galleryPathIsNested(path: string, parent: string): boolean {
  const current = normalizeGalleryPath(path);
  const normalizedParent = normalizeGalleryPath(parent);
  if (normalizedParent === '/') return current !== '/';
  return current.startsWith(`${normalizedParent}/`);
}

function taskWithPaths(task: GenerationTask, paths: string[]): GenerationTask {
  const galleryPaths = normalizeGalleryPaths(paths);
  return { ...task, galleryPath: galleryPaths[0] ?? '/', galleryPaths, updatedAt: Date.now() };
}

function movePlacement(paths: string[], sourcePath: string, targetPath: string): string[] {
  const source = normalizeGalleryPath(sourcePath);
  const target = normalizeGalleryPath(targetPath);
  const rest = normalizeGalleryPaths(paths).filter((path) => path !== source);
  return normalizeGalleryPaths([...rest, target], target);
}

function cloneImageForTask(image: GeneratedImage, taskId: string, batchItemId?: string): GeneratedImage {
  return {
    ...image,
    id: uid('image'),
    taskId,
    batchItemId: batchItemId ?? image.batchItemId,
    storageAssetKey: undefined,
    storageThumbnailKey: undefined,
    storageAssetLoaded: undefined,
    request: image.request ? { ...image.request } : undefined
  };
}

function cloneTaskIntoPath(task: GenerationTask, targetPath: string): GenerationTask {
  const taskId = uid('task');
  const createdAt = Date.now();
  const batchIdMap = new Map<string, string>();
  const batch = task.batch ? {
    ...task.batch,
    items: task.batch.items.map((item) => {
      const nextItemId = uid('batch-item');
      batchIdMap.set(item.id, nextItemId);
      return {
        ...item,
        id: nextItemId,
        images: item.images.map((image) => cloneImageForTask(image, taskId, nextItemId))
      };
    })
  } : undefined;
  const galleryPaths = normalizeGalleryPaths(undefined, targetPath);
  return {
    ...task,
    id: taskId,
    createdAt,
    updatedAt: createdAt,
    galleryPath: galleryPaths[0] ?? '/',
    galleryPaths,
    images: task.images.map((image) => cloneImageForTask(image, taskId, image.batchItemId ? batchIdMap.get(image.batchItemId) : undefined)),
    batch
  };
}

export async function moveServerGalleryTask(taskId: string, targetPath: string): Promise<void> {
  const galleryPath = normalizeGalleryPath(targetPath);
  await patchTask(taskId, (task) => taskWithPaths(task, [galleryPath]));
}

export async function moveServerGalleryFolderTasks(sourcePath: string, nextPath: string): Promise<void> {
  const source = normalizeGalleryPath(sourcePath);
  const target = normalizeGalleryPath(nextPath);
  await mutateTasks((tasks) => tasks.map((task) => {
    const paths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath).map((path) => (
      path === source || galleryPathIsNested(path, source) ? mapGallerySubPath(path, source, target) : path
    ));
    return taskWithPaths(task, paths);
  }));
}

export type ServerGalleryPasteOperation = 'move' | 'link-copy' | 'deep-copy';

export interface ServerGalleryPasteItem {
  itemKind: 'task' | 'folder';
  itemId: string;
  sourcePath: string;
  nextPath?: string;
}

export async function pasteServerGalleryItems(args: { operation: ServerGalleryPasteOperation; targetPath: string; items: ServerGalleryPasteItem[] }): Promise<void> {
  const target = normalizeGalleryPath(args.targetPath);
  const items = args.items.map((item) => ({ ...item, sourcePath: normalizeGalleryPath(item.sourcePath), nextPath: item.nextPath ? normalizeGalleryPath(item.nextPath) : undefined }));
  await mutateTasks((tasks) => {
    const appended: GenerationTask[] = [];
    const nextTasks = tasks.flatMap((task) => {
      let paths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath);
      const taskSelections = items.filter((item) => item.itemKind === 'task' && item.itemId === task.id);
      const folderSelections = items.filter((item) => item.itemKind === 'folder');

      for (const item of taskSelections) {
        if (args.operation === 'move') paths = movePlacement(paths, item.sourcePath, target);
        if (args.operation === 'link-copy') paths = addGalleryPath(paths, target);
        if (args.operation === 'deep-copy') appended.push(cloneTaskIntoPath(task, target));
      }

      for (const item of folderSelections) {
        const nextRoot = item.nextPath ?? target;
        for (const path of normalizeGalleryPaths(task.galleryPaths, task.galleryPath)) {
          if (path !== item.sourcePath && !galleryPathIsNested(path, item.sourcePath)) continue;
          const mapped = mapGallerySubPath(path, item.sourcePath, nextRoot);
          if (args.operation === 'move') paths = movePlacement(paths, path, mapped);
          if (args.operation === 'link-copy') paths = addGalleryPath(paths, mapped);
          if (args.operation === 'deep-copy') appended.push(cloneTaskIntoPath(task, mapped));
        }
      }

      return [taskWithPaths(task, paths)];
    });
    return [...appended, ...nextTasks];
  });
}

export async function deleteServerGalleryFolderTasks(folderPath: string): Promise<void> {
  const source = normalizeGalleryPath(folderPath);
  await mutateTasks((tasks) => tasks.flatMap((task) => {
    const paths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath).filter((path) => path !== source && !galleryPathIsNested(path, source));
    return paths.length > 0 ? [taskWithPaths(task, paths)] : [];
  }));
}
