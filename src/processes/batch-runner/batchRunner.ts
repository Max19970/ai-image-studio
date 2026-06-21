import { submitImageRequest } from '../../infrastructure/api';
import { createRunnerAbortController, normalizeRunnerFailure, releaseRunnerAbortController } from '../generation-runner/cancellation';
import { countStreamedFinalImages, mapBatchGenerationFinalImages, mapBatchStreamingImage } from '../generation-runner/resultMapper';
import type { BatchEventSink } from './events';
import { createBatchRunProgressTracker } from './batchRunProgress';
import { createBatchTaskModel } from './batchTaskModel';
import { reduceBatchTask, type BatchTaskReducerEvent } from './batchTaskReducer';
import { prepareBatchItems } from './requestBuilder';
import { createBatchItemRetryPolicy, runBatchItemWithRetryPolicy } from './retryPolicy';
import { normalizeBatchIntervalSeconds, runDelayedParallelScheduler } from './schedule';
import type { BatchGenerationRunInput, PreparedBatchItem } from './types';

export async function runBatchGeneration(input: BatchGenerationRunInput, onEvent?: BatchEventSink) {
  const { intervalSeconds, taskHistory, t } = input;
  const prepared = prepareBatchItems(input);
  if (prepared.length === 0) return false;

  const intervalMs = normalizeBatchIntervalSeconds(intervalSeconds);
  const model = createBatchTaskModel({ prepared, intervalMs, createdAt: Date.now(), t });
  const { taskId, request, batchItems, task } = model;
  const controller = createRunnerAbortController(taskId, taskHistory);
  const progress = createBatchRunProgressTracker(prepared.length, t);
  const dispatchTask = (event: BatchTaskReducerEvent) => {
    taskHistory.updateTask(taskId, (current) => reduceBatchTask(current, event));
  };

  taskHistory.setTasks((prev) => [task, ...prev]);
  onEvent?.({ type: 'queued', taskId, request, itemCount: prepared.length, intervalMs });
  batchItems.forEach((item, itemIndex) => {
    onEvent?.({ type: 'item-queued', taskId, itemId: item.id, itemIndex });
  });

  const runBatchItem = async (preparedItem: PreparedBatchItem, itemIndex: number) => {
    const batchItem = batchItems[itemIndex];
    dispatchTask({ type: 'item-sending', itemId: batchItem.id });
    onEvent?.({ type: 'item-started', taskId, itemId: batchItem.id, itemIndex });

    try {
      const result = await runBatchItemWithRetryPolicy({
        policy: createBatchItemRetryPolicy({
          attempts: preparedItem.draft.params.retryAttempts,
          delaySeconds: preparedItem.draft.params.retryDelaySeconds
        }),
        run: () => {
          dispatchTask({ type: 'item-running', itemId: batchItem.id, aggregateError: progress.getAggregateError() });
          return submitImageRequest({
            provider: preparedItem.provider,
            payload: preparedItem.payload,
            mode: preparedItem.snapshot.mode,
            providerMode: preparedItem.providerMode,
            targetImage: preparedItem.draft.targetImage,
            referenceImages: preparedItem.draft.referenceImages,
            mask: preparedItem.draft.mask,
            signal: controller.signal,
            onStreamImage: (image) => {
              const attached = mapBatchStreamingImage({
                image,
                request: preparedItem.snapshot,
                taskId,
                batchItemId: batchItem.id,
                batchItemIndex: itemIndex,
                globalStartIndex: image.kind === 'partial' ? itemIndex * 1000 : progress.reserveImageIndexes(1)
              });
              dispatchTask({ type: 'item-streamed', itemId: batchItem.id, image: attached });
              onEvent?.({ type: 'item-streaming', taskId, itemId: batchItem.id, itemIndex, image: attached });
            },
            onProgress: (itemProgress) => {
              dispatchTask({ type: 'item-progress', itemId: batchItem.id, progress: itemProgress, aggregateError: progress.getAggregateError() });
            }
          });
        },
        onRetry: ({ attempt, totalAttempts, error, waitMs }) => {
          const retryText = t('app.retryWaiting', { attempt, total: totalAttempts, seconds: Math.round(waitMs / 1000), error });
          dispatchTask({ type: 'item-retrying', itemId: batchItem.id, retryText, aggregateError: progress.getAggregateError() });
          onEvent?.({ type: 'item-retrying', taskId, itemId: batchItem.id, itemIndex, attempt, totalAttempts, error, waitMs });
        },
        signal: controller.signal
      });

      const streamed = result.streamed;
      const finalImageCount = streamed ? countStreamedFinalImages(result.images) : result.images.length;
      const finalImages = mapBatchGenerationFinalImages({
        result,
        request: preparedItem.snapshot,
        taskId,
        batchItemId: batchItem.id,
        batchItemIndex: itemIndex,
        globalStartIndex: progress.reserveImageIndexes(finalImageCount),
        streamed
      });

      dispatchTask({ type: 'item-succeeded', itemId: batchItem.id, images: finalImages, raw: result.raw, streamed });
      onEvent?.({ type: 'item-succeeded', taskId, itemId: batchItem.id, itemIndex, status: 'succeeded', imageCount: finalImages.length || result.images.length });
    } catch (error) {
      const failure = normalizeRunnerFailure(error, t);
      progress.recordItemFailure(itemIndex, failure.message, failure.cancelled);
      dispatchTask({
        type: failure.cancelled ? 'item-cancelled' : 'item-failed',
        itemId: batchItem.id,
        error: failure.message,
        aggregateError: progress.getAggregateError()
      });
      onEvent?.(
        failure.cancelled
          ? { type: 'item-cancelled', taskId, itemId: batchItem.id, itemIndex, status: 'cancelled', error: failure.message }
          : { type: 'item-failed', taskId, itemId: batchItem.id, itemIndex, status: 'failed', error: failure.message }
      );
    }
  };

  try {
    dispatchTask({ type: 'batch-started' });
    onEvent?.({ type: 'started', taskId, itemCount: prepared.length, intervalMs });

    await runDelayedParallelScheduler({
      items: prepared,
      intervalMs,
      signal: controller.signal,
      onBeforeRun: ({ index }) => {
        dispatchTask({ type: 'item-sending', itemId: batchItems[index].id });
      },
      run: async ({ item, index }) => {
        await runBatchItem(item, index);
      }
    });

    let terminal = progress.resolveTerminal(task);
    taskHistory.updateTask(taskId, (current) => {
      terminal = progress.resolveTerminal(current);
      return reduceBatchTask(current, { type: 'batch-finished', status: terminal.status, error: terminal.error });
    });

    if (terminal.status === 'succeeded') {
      onEvent?.({ type: 'succeeded', taskId, status: 'succeeded', error: null });
    } else if (terminal.cancelled) {
      onEvent?.({ type: 'cancelled', taskId, status: 'cancelled', error: terminal.error ?? t('app.cancelled') });
    } else {
      onEvent?.({ type: 'failed', taskId, status: 'failed', error: terminal.error ?? 'Unknown batch error' });
    }
  } catch (error) {
    const failure = normalizeRunnerFailure(error, t);
    dispatchTask({ type: 'active-items-cancelled', error: failure.message });
    onEvent?.(
      failure.cancelled
        ? { type: 'cancelled', taskId, status: 'cancelled', error: failure.message }
        : { type: 'failed', taskId, status: 'failed', error: failure.message }
    );
  } finally {
    releaseRunnerAbortController(taskId, taskHistory);
  }

  return true;
}
