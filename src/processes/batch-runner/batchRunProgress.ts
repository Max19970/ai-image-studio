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

interface BatchTerminalRuleContext {
  task: GenerationTask;
  errorText: string;
  cancelledByIndex: readonly boolean[];
}

interface BatchTerminalRule {
  status: GenerationStatus;
  matches: (context: BatchTerminalRuleContext) => boolean;
}

const batchTerminalRules: readonly BatchTerminalRule[] = [
  { status: 'succeeded', matches: ({ task }) => task.images.length > 0 },
  { status: 'succeeded', matches: ({ errorText }) => !errorText },
  {
    status: 'cancelled',
    matches: ({ task, cancelledByIndex }) => task.batch?.items.length
      ? task.batch.items.every((item) => item.status === 'cancelled')
      : cancelledByIndex.every(Boolean)
  },
  { status: 'failed', matches: () => true }
];

function resolveBatchTerminalStatus(context: BatchTerminalRuleContext): GenerationStatus {
  return batchTerminalRules.find((rule) => rule.matches(context))?.status ?? 'failed';
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
      const finalStatus = resolveBatchTerminalStatus({ task, errorText, cancelledByIndex });
      return {
        status: finalStatus,
        error: errorText || null,
        cancelled: finalStatus === 'cancelled'
      };
    }
  };
}
