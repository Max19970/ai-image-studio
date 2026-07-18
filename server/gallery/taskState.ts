import { addGalleryPath, mapGallerySubPath, normalizeGalleryPath, normalizeGalleryPaths } from '../../src/domain/galleryFilesystem';
import type { GenerationTask } from '../../src/domain/generationTask';
import { normalizeGenerationTasks } from '../../src/entities/storage';
import {
  galleryItemCanContainChildren,
  galleryPasteOperationDuplicatesTasks,
  galleryPasteOperationPreservesSource,
  type GalleryItemKind,
  type GalleryPasteOperation
} from './descriptors';
import { cloneGenerationTaskForGalleryCopy, generationTaskNeedsFullAssetsForCopy } from './taskCopy';

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

export type FullGalleryTaskLoader = (taskIds: string[]) => Promise<GenerationTask[]>;

function galleryPathIsNested(path: string, parent: string): boolean {
  const current = normalizeGalleryPath(path);
  const normalizedParent = normalizeGalleryPath(parent);
  return normalizedParent === '/' ? current !== '/' : current.startsWith(`${normalizedParent}/`);
}

function taskWithPaths(task: GenerationTask, paths: string[]): GenerationTask {
  const galleryPaths = normalizeGalleryPaths(paths);
  return { ...task, galleryPath: galleryPaths[0] ?? '/', galleryPaths, updatedAt: Date.now() };
}

function movePlacement(paths: string[], sourcePath: string, targetPath: string): string[] {
  const source = normalizeGalleryPath(sourcePath);
  const target = normalizeGalleryPath(targetPath);
  return normalizeGalleryPaths([
    ...normalizeGalleryPaths(paths).filter((path) => path !== source),
    target
  ], target);
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

async function resolveCopySources(
  tasks: GenerationTask[],
  items: ServerGalleryPasteItem[],
  loadFullTasks: FullGalleryTaskLoader
): Promise<Map<string, GenerationTask>> {
  const selected = tasks.filter((task) => taskSelectedForCopy(task, items));
  const idsToHydrate = selected.filter(generationTaskNeedsFullAssetsForCopy).map((task) => task.id);
  if (idsToHydrate.length === 0) return new Map(selected.map((task) => [task.id, task]));
  const loaded = normalizeGenerationTasks(await loadFullTasks(idsToHydrate), { interruptActive: false });
  const fullById = new Map(loaded.map((task) => [task.id, task]));
  return new Map(selected.map((task) => [task.id, fullById.get(task.id) ?? task]));
}

export function moveGalleryTaskState(tasks: GenerationTask[], taskId: string, targetPath: string): GenerationTask[] {
  const target = normalizeGalleryPath(targetPath);
  return tasks.map((task) => task.id === taskId ? taskWithPaths(task, [target]) : task);
}

export function moveGalleryFolderTasksState(tasks: GenerationTask[], sourcePath: string, nextPath: string): GenerationTask[] {
  const source = normalizeGalleryPath(sourcePath);
  const target = normalizeGalleryPath(nextPath);
  return tasks.map((task) => taskWithPaths(task, normalizeGalleryPaths(task.galleryPaths, task.galleryPath).map((path) => (
    path === source || galleryPathIsNested(path, source) ? mapGallerySubPath(path, source, target) : path
  ))));
}

export async function pasteGalleryTasksState(args: {
  tasks: GenerationTask[];
  operation: GalleryPasteOperation;
  targetPath: string;
  items: ServerGalleryPasteItem[];
  loadFullTasks: FullGalleryTaskLoader;
}): Promise<{ tasks: GenerationTask[]; result: ServerGalleryPasteResult }> {
  const target = normalizeGalleryPath(args.targetPath);
  const items = normalizedPasteItems(args.items);
  const copySources = galleryPasteOperationDuplicatesTasks(args.operation)
    ? await resolveCopySources(args.tasks, items, args.loadFullTasks)
    : new Map<string, GenerationTask>();
  const copiedTasks: ServerGalleryPasteResult['copiedTasks'] = [];
  const appended: GenerationTask[] = [];

  const tasks = args.tasks.map((task) => {
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
        paths = galleryPasteOperationPreservesSource(args.operation)
          ? addGalleryPath(paths, target)
          : movePlacement(paths, item.sourcePath, target);
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
          paths = galleryPasteOperationPreservesSource(args.operation)
            ? addGalleryPath(paths, mapped)
            : movePlacement(paths, path, mapped);
        }
      }
    }

    return taskWithPaths(task, paths);
  });

  return { tasks: [...appended, ...tasks], result: { copiedTasks } };
}

export function deleteGalleryFolderTasksState(tasks: GenerationTask[], folderPath: string): {
  tasks: GenerationTask[];
  result: ServerGalleryDeleteResult;
} {
  const source = normalizeGalleryPath(folderPath);
  const deletedTaskIds: string[] = [];
  const remaining = tasks.flatMap((task) => {
    const paths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath)
      .filter((path) => path !== source && !galleryPathIsNested(path, source));
    if (paths.length > 0) return [taskWithPaths(task, paths)];
    deletedTaskIds.push(task.id);
    return [];
  });
  return { tasks: remaining, result: { deletedTaskIds } };
}
