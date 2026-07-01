import type { GenerationTask } from '../../domain/generationTask';
import { batchTaskReducerHandlerFallbackModules } from './batchTaskReducer.generated';
import type { BatchTaskReducerEvent, BatchTaskReducerHandler } from './batchTaskReducerTypes';

export type { BatchTaskReducerEvent, BatchTaskReducerHandler, KnownBatchTaskReducerEvent } from './batchTaskReducerTypes';

function isBatchTaskReducerHandler(value: unknown): value is BatchTaskReducerHandler {
  const candidate = value as Partial<BatchTaskReducerHandler> | null;
  return Boolean(candidate?.type && typeof candidate.reduce === 'function');
}

const batchTaskReducerHandlersByType = new Map(
  Object.values(batchTaskReducerHandlerFallbackModules)
    .flatMap((module) => Object.values(module).filter(isBatchTaskReducerHandler))
    .map((handler) => [handler.type, handler] as const)
);

export function reduceBatchTask(task: GenerationTask, event: BatchTaskReducerEvent, now = Date.now()): GenerationTask {
  const handler = batchTaskReducerHandlersByType.get(event.type);
  if (!handler) return task;
  return handler.reduce(task, event, now);
}
