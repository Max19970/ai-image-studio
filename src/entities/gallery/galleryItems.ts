import type { GalleryFolder } from '../../domain/galleryFilesystem';
import { getGalleryParentPath, normalizeGalleryPath, normalizeGalleryPaths } from '../../domain/galleryFilesystem';
import type { GenerationTask } from '../../domain/generationTask';

export type GalleryItem = GalleryFolderItem | GalleryTaskItem;

export interface GalleryFolderItem {
  kind: 'folder';
  id: string;
  path: string;
  parentPath: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  childTaskCount: number;
  childFolderCount: number;
  pinned: boolean;
  tags: string[];
}

export interface GalleryTaskItem {
  kind: 'task';
  id: string;
  path: string;
  task: GenerationTask;
  pinned: boolean;
  tags: string[];
}

export function galleryTaskPaths(task: GenerationTask): string[] {
  return normalizeGalleryPaths(task.galleryPaths, task.galleryPath);
}

export function galleryTaskPath(task: GenerationTask): string {
  return galleryTaskPaths(task)[0] ?? normalizeGalleryPath(task.galleryPath);
}

export function resolveGalleryItems(args: {
  folders: GalleryFolder[];
  tasks: GenerationTask[];
  activePath: string;
  pinKeys?: Set<string>;
  tagMap?: Map<string, string[]>;
}): GalleryItem[] {
  const activePath = normalizeGalleryPath(args.activePath);
  const folders = args.folders.filter((folder) => getGalleryParentPath(folder.path) === activePath);
  const taskPlacements = args.tasks.flatMap((task) => galleryTaskPaths(task).map((path) => ({ task, path })));
  const tasks = taskPlacements.filter((placement) => placement.path === activePath);

  const childTaskCounts = new Map<string, number>();
  for (const placement of taskPlacements) {
    for (const folder of args.folders) {
      if (placement.path === folder.path || placement.path.startsWith(`${folder.path}/`)) {
        childTaskCounts.set(folder.path, (childTaskCounts.get(folder.path) ?? 0) + 1);
      }
    }
  }

  const childFolderCounts = new Map<string, number>();
  for (const folder of args.folders) {
    const parent = getGalleryParentPath(folder.path);
    if (parent !== activePath) childFolderCounts.set(parent, (childFolderCounts.get(parent) ?? 0) + 1);
  }

  return [
    ...folders.map((folder): GalleryFolderItem => {
      const key = `folder:${folder.path}`;
      return {
        kind: 'folder',
        id: folder.id,
        path: folder.path,
        parentPath: getGalleryParentPath(folder.path),
        name: folder.name,
        createdAt: folder.createdAt,
        updatedAt: folder.updatedAt,
        childTaskCount: childTaskCounts.get(folder.path) ?? 0,
        childFolderCount: childFolderCounts.get(folder.path) ?? 0,
        pinned: Boolean(args.pinKeys?.has(key)),
        tags: args.tagMap?.get(key) ?? []
      };
    }),
    ...tasks.map(({ task, path }): GalleryTaskItem => {
      const key = `task:${task.id}`;
      return {
        kind: 'task',
        id: `${task.id}@${path}`,
        path,
        task,
        pinned: Boolean(args.pinKeys?.has(key)),
        tags: args.tagMap?.get(key) ?? []
      };
    })
  ];
}
