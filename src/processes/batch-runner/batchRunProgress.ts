import type { GenerationStatus, GenerationTask } from '../../domain/generationTask';
import type { RunnerTranslateFn } from '../generation-runner/types';

export interface BatchTerminalResolution {
  status: GenerationStatus;
  error: string | null;
  cancelled: boolean;
}

export interface BatchRunProgressTracker {
  reserveImageIndexes: (count: number) => number;
  recordItemFailure: (itemIndex: number, error: string, cancelled: boolean) => void;
  getAggregateError: () => string;
  resolveTerminal: (task: GenerationTask) => BatchTerminalResolution;
}

export function createBatchRunProgressTracker(itemCount: number, t: RunnerTranslateFn): BatchRunProgressTracker {
  let globalImageIndex = 0;
  const errorsByIndex: Array<string | null> = Array(itemCount).fill(null);
  const cancelledByIndex: boolean[] = Array(itemCount).fill(false);

  const getAggregateError = () => errorsByIndex.filter(Boolean).join('\n');

  return {
    reserveImageIndexes(count) {
      const start = globalImageIndex;
      globalImageIndex += Math.max(0, count);
      return start;
    },
    recordItemFailure(itemIndex, error, cancelled) {
      cancelledByIndex[itemIndex] = cancelled;
      errorsByIndex[itemIndex] = t('batch.itemError', { index: itemIndex + 1, error });
    },
    getAggregateError,
    resolveTerminal(task) {
      const errorText = getAggregateError();
      const hasImages = task.images.length > 0;
      const everyTerminalCancelled = task.batch?.items.length
        ? task.batch.items.every((item) => item.status === 'cancelled')
        : cancelledByIndex.every(Boolean);
      const finalStatus: GenerationStatus = hasImages || !errorText ? 'succeeded' : everyTerminalCancelled ? 'cancelled' : 'failed';
      return {
        status: finalStatus,
        error: errorText || null,
        cancelled: finalStatus === 'cancelled'
      };
    }
  };
}
