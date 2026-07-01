import type { GenerationTask } from '../../../src/domain/generationTask';
import { reduceBatchTask } from '../../../src/processes/batch-runner/batchTaskReducer';

export function reduceCancelledBatchItem(task: GenerationTask, itemId: string): GenerationTask {
  return reduceBatchTask(task, {
    type: 'item-cancelled',
    itemId,
    error: 'Request was cancelled.',
    aggregateError: null
  });
}
