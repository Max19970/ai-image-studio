import type { GenerationTask } from '../../../src/domain/generationTask';
import { ensureRuntimeTasks, mutateTasks, patchTask } from './runtimeStore';

export interface GenerationCancellationTaskStorePort {
  ensureTasks(): GenerationTask[];
  mutateTasks(recipe: (tasks: GenerationTask[]) => GenerationTask[]): Promise<void>;
  patchTask(taskId: string, recipe: (task: GenerationTask) => GenerationTask, options?: { persist?: boolean }): Promise<void>;
}

export const defaultGenerationCancellationTaskStore: GenerationCancellationTaskStorePort = {
  ensureTasks: ensureRuntimeTasks,
  mutateTasks,
  patchTask
};
