import type express from 'express';
import type { GenerationTask } from '../../../src/domain/generationTask';
import type { ServerBatchGenerationRunInput } from './batchRun';
import type { ServerGenerationRunInput } from './providerPipeline';
import {
  cancelServerBatchGenerationItem,
  cancelServerGenerationTask,
  clearServerGenerationTasks,
  deleteServerGenerationTask
} from './cancellation';
import { startServerBatchGenerationRun } from './batchRun';
import { startServerGenerationRun } from './singleRun';
import {
  deleteServerGalleryFolderTasks,
  moveServerGalleryFolderTasks,
  moveServerGalleryTask,
  pasteServerGalleryItems,
  type ServerGalleryDeleteResult,
  type ServerGalleryPasteItem,
  type ServerGalleryPasteOperation,
  type ServerGalleryPasteResult
} from './galleryMutations';
import { subscribeGenerationTaskEvents } from './index';

export type { ServerGalleryPasteItem, ServerGalleryPasteOperation } from './galleryMutations';

export interface GenerationTaskGalleryMutationPort {
  moveGalleryTask(taskId: string, targetPath: string): Promise<void>;
  moveGalleryFolderTasks(sourcePath: string, nextPath: string): Promise<void>;
  pasteGalleryItems(args: { operation: ServerGalleryPasteOperation; targetPath: string; items: ServerGalleryPasteItem[] }): Promise<ServerGalleryPasteResult>;
  deleteGalleryFolderTasks(folderPath: string): Promise<ServerGalleryDeleteResult>;
}

export interface GenerationTaskRuntimePort extends GenerationTaskGalleryMutationPort {
  subscribeEvents(req: express.Request, res: express.Response): void;
  startSingle(input: ServerGenerationRunInput): Promise<GenerationTask>;
  startBatch(input: ServerBatchGenerationRunInput): Promise<GenerationTask>;
  clearAll(): Promise<void>;
  removeOne(taskId: string): Promise<void>;
  stopTask(taskId: string): Promise<void>;
  stopBatchItem(taskId: string, itemId: string): Promise<void>;
}

export const defaultGenerationTaskRuntimePort: GenerationTaskRuntimePort = {
  subscribeEvents: subscribeGenerationTaskEvents,
  startSingle: startServerGenerationRun,
  startBatch: startServerBatchGenerationRun,
  clearAll: clearServerGenerationTasks,
  removeOne: deleteServerGenerationTask,
  stopTask: cancelServerGenerationTask,
  stopBatchItem: cancelServerBatchGenerationItem,
  moveGalleryTask: moveServerGalleryTask,
  moveGalleryFolderTasks: moveServerGalleryFolderTasks,
  pasteGalleryItems: pasteServerGalleryItems,
  deleteGalleryFolderTasks: deleteServerGalleryFolderTasks
};
