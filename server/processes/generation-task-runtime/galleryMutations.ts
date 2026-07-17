import type { GalleryPasteOperation } from '../../gallery/descriptors';
import {
  deleteGalleryFolderTasksState,
  moveGalleryFolderTasksState,
  moveGalleryTaskState,
  pasteGalleryTasksState,
  type ServerGalleryDeleteResult,
  type ServerGalleryPasteItem,
  type ServerGalleryPasteResult,
  type ServerGalleryTaskCopyMapping
} from '../../gallery/taskState';
import {
  loadGenerationTaskHistoryDocumentsByIdsAsync,
  saveGenerationTaskHistoryDocumentsAsync
} from '../../storage/generationTaskStoreAsync';
import { normalizeGenerationTasks } from '../../../src/entities/storage';
import { commitGalleryMutation, mutateTasks } from './runtimeStore';

export type ServerGalleryPasteOperation = GalleryPasteOperation;
export type {
  ServerGalleryDeleteResult,
  ServerGalleryPasteItem,
  ServerGalleryPasteResult,
  ServerGalleryTaskCopyMapping
} from '../../gallery/taskState';

async function loadFullTasks(taskIds: string[]) {
  const loaded = await loadGenerationTaskHistoryDocumentsByIdsAsync(taskIds, 'full');
  return normalizeGenerationTasks(loaded.tasks, { interruptActive: false });
}

export async function moveServerGalleryTask(taskId: string, targetPath: string): Promise<void> {
  await mutateTasks((tasks) => moveGalleryTaskState(tasks, taskId, targetPath));
}

export async function moveServerGalleryFolderTasks(sourcePath: string, nextPath: string): Promise<void> {
  await mutateTasks((tasks) => moveGalleryFolderTasksState(tasks, sourcePath, nextPath));
}

export async function pasteServerGalleryItems(args: {
  operation: ServerGalleryPasteOperation;
  targetPath: string;
  items: ServerGalleryPasteItem[];
}): Promise<ServerGalleryPasteResult> {
  return commitGalleryMutation(
    async (tasks) => {
      const prepared = await pasteGalleryTasksState({ ...args, tasks, loadFullTasks });
      return { tasks: prepared.tasks, payload: undefined, result: prepared.result };
    },
    async (tasks) => {
      await saveGenerationTaskHistoryDocumentsAsync(tasks);
    }
  );
}

export async function deleteServerGalleryFolderTasks(folderPath: string): Promise<ServerGalleryDeleteResult> {
  let result: ServerGalleryDeleteResult = { deletedTaskIds: [] };
  await mutateTasks((tasks) => {
    const prepared = deleteGalleryFolderTasksState(tasks, folderPath);
    result = prepared.result;
    return prepared.tasks;
  });
  return result;
}
