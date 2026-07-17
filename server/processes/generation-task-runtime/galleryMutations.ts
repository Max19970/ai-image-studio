import { addGalleryPath, mapGallerySubPath, normalizeGalleryPath, normalizeGalleryPaths } from '../../../src/domain/galleryFilesystem';
import type { GenerationTask } from '../../../src/domain/generationTask';
import { normalizeGenerationTasks } from '../../../src/entities/storage';
import {
  galleryItemCanContainChildren,
  galleryPasteOperationDuplicatesTasks,
  galleryPasteOperationPreservesSource,
  type GalleryItemKind,
  type GalleryPasteOperation
} from '../../gallery/descriptors';
import {
  cloneGenerationTaskForGalleryCopy,
  generationTaskNeedsFullAssetsForCopy
} from '../../gallery/taskCopy';
import { loadGenerationTaskHistoryDocumentsByIdsAsync } from '../../storage/generationTaskStoreAsync';
import { ensureRuntimeTasks, mutateTasks, patchTask } from './runtimeStore';

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

export type ServerGalleryPasteOperation = GalleryPasteOperation;

export interface ServerGalleryPasteItem {
  itemKind: GalleryItemKind;
  itemId: string;
  sourcePath: string;
  nextPath?: string;
}

export interface ServerGalleryTaskCopyMapping {
  sourceTaskId: string;
  nextTaskId: string;
}

export interface ServerGalleryPasteResult {
  copiedTasks: ServerGalleryTaskCopyMapping[];
}

export interface ServerGalleryDeleteResult {
  deletedTaskIds: string[];
}

function applyTaskGalleryPasteOperation(operation: ServerGalleryPasteOperation, paths: string[], sourcePath: string, targetPath: string): string[] {
  if (!galleryPasteOperationPreservesSource(operation)) return movePlacement(paths, sourcePath, targetPath);
  return addGalleryPath(paths, targetPath);
}

function normalizedPasteItems(items: ServerGalleryPasteItem[]): ServerGalleryPasteItem[] {
  return items.map((item) => ({
    ...item,
    sourcePath: normalizeGalleryPath(item.sourcePath),
    nextPath: item.nextPath ? normalizeGalleryPath(item.nextPath) : undefined
  }));
}

function taskSelectedForCopy(task: GenerationTask, items: ServerGalleryPasteItem[]): boolean {
  if (items.some((item) => !galleryItemCanContainChildren(item.itemKind) && item.itemId === task.id)) return true;
  const paths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath);
  return items.some((item) => galleryItemCanContainChildren(item.itemKind)
    && paths.some((path) => path === item.sourcePath || galleryPathIsNested(path, item.sourcePath)));
}

async function loadCopySources(items: ServerGalleryPasteItem[]): Promise<Map<string, GenerationTask>> {
  const runtimeTasks = await ensureRuntimeTasks();
  const selected = runtimeTasks.filter((task) => taskSelectedForCopy(task, items));
  const idsToHydrate = selected.filter(generationTaskNeedsFullAssetsForCopy).map((task) => task.id);
  if (idsToHydrate.length === 0) return new Map(selected.map((task) => [task.id, task]));

  const loaded = await loadGenerationTaskHistoryDocumentsByIdsAsync(idsToHydrate, 'full');
  const fullTasks = normalizeGenerationTasks(loaded.tasks, { interruptActive: false });
  const fullById = new Map(fullTasks.map((task) => [task.id, task]));
  return new Map(selected.map((task) => [task.id, fullById.get(task.id) ?? task]));
}

export async function pasteServerGalleryItems(args: {
  operation: ServerGalleryPasteOperation;
  targetPath: string;
  items: ServerGalleryPasteItem[];
}): Promise<ServerGalleryPasteResult> {
  const target = normalizeGalleryPath(args.targetPath);
  const items = normalizedPasteItems(args.items);
  const copySources = galleryPasteOperationDuplicatesTasks(args.operation)
    ? await loadCopySources(items)
    : new Map<string, GenerationTask>();
  const copiedTasks: ServerGalleryTaskCopyMapping[] = [];

  await mutateTasks((tasks) => {
    const appended: GenerationTask[] = [];
    const nextTasks = tasks.flatMap((task) => {
      let paths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath);
      const taskSelections = items.filter((item) => !galleryItemCanContainChildren(item.itemKind) && item.itemId === task.id);
      const folderSelections = items.filter((item) => galleryItemCanContainChildren(item.itemKind));
      const copySource = copySources.get(task.id) ?? task;

      for (const item of taskSelections) {
        if (galleryPasteOperationDuplicatesTasks(args.operation)) {
          const copy = cloneGenerationTaskForGalleryCopy(copySource, target);
          appended.push(copy);
          copiedTasks.push({ sourceTaskId: task.id, nextTaskId: copy.id });
        } else {
          paths = applyTaskGalleryPasteOperation(args.operation, paths, item.sourcePath, target);
        }
      }

      for (const item of folderSelections) {
        const nextRoot = item.nextPath ?? target;
        for (const path of normalizeGalleryPaths(task.galleryPaths, task.galleryPath)) {
          if (path !== item.sourcePath && !galleryPathIsNested(path, item.sourcePath)) continue;
          const mapped = mapGallerySubPath(path, item.sourcePath, nextRoot);
          if (galleryPasteOperationDuplicatesTasks(args.operation)) {
            const copy = cloneGenerationTaskForGalleryCopy(copySource, mapped);
            appended.push(copy);
            copiedTasks.push({ sourceTaskId: task.id, nextTaskId: copy.id });
          } else {
            paths = applyTaskGalleryPasteOperation(args.operation, paths, path, mapped);
          }
        }
      }

      return [taskWithPaths(task, paths)];
    });
    return [...appended, ...nextTasks];
  });

  return { copiedTasks };
}

export async function deleteServerGalleryFolderTasks(folderPath: string): Promise<ServerGalleryDeleteResult> {
  const source = normalizeGalleryPath(folderPath);
  const deletedTaskIds: string[] = [];
  await mutateTasks((tasks) => tasks.flatMap((task) => {
    const paths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath).filter((path) => path !== source && !galleryPathIsNested(path, source));
    if (paths.length > 0) return [taskWithPaths(task, paths)];
    deletedTaskIds.push(task.id);
    return [];
  }));
  return { deletedTaskIds };
}
