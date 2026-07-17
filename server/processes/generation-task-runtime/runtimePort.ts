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
import { subscribeGenerationTaskEvents } from './index';

export interface GenerationTaskRuntimePort {
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
  stopBatchItem: cancelServerBatchGenerationItem
};
