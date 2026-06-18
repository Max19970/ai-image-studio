import type { BatchGenerationItem, GenerationStatus, GenerationTask } from '../../domain/generationTask';
import { createAggregateSnapshot } from './requestBuilder';
import type { PreparedBatchItem } from './types';
import type { RunnerTranslateFn } from '../generation-runner/types';

export interface BatchTaskModelInput {
  prepared: PreparedBatchItem[];
  intervalMs: number;
  createdAt: number;
  t: RunnerTranslateFn;
}

export interface BatchTaskModel {
  taskId: string;
  request: GenerationTask['request'];
  batchItems: BatchGenerationItem[];
  task: GenerationTask;
}

export function createBatchTaskModel(input: BatchTaskModelInput): BatchTaskModel {
  const taskId = crypto.randomUUID();
  const batchItems: BatchGenerationItem[] = input.prepared.map((item, index) => ({
    id: crypto.randomUUID(),
    index,
    status: 'queued' as GenerationStatus,
    request: item.snapshot,
    images: []
  }));

  const request = createAggregateSnapshot({
    prepared: input.prepared,
    intervalMs: input.intervalMs,
    createdAt: input.createdAt,
    t: input.t
  });

  return {
    taskId,
    request,
    batchItems,
    task: {
      id: taskId,
      kind: 'batch',
      status: 'queued',
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
      request,
      images: [],
      batch: {
        intervalMs: input.intervalMs,
        items: batchItems
      }
    }
  };
}
