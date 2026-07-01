import type { GeneratedImage, GenerationStatus, GenerationTask } from '../../../domain/generationTask';
import { isActiveGenerationStatus, transitionTask, transitionTaskBatchItem } from '../../generation-task-lifecycle';
import { upsertLiveStreamingImage } from '../../generation-runner/resultMapper';
import type { BatchTaskReducerHandler, KnownBatchTaskReducerEvent } from '../batchTaskReducerTypes';

export const batchStartedHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'batch-started' }>> = {
  type: 'batch-started',
  reduce: (task, _event, now) => transitionTask(task, { status: 'running', error: null, updatedAt: now })
};

export const itemSendingHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'item-sending' }>> = {
  type: 'item-sending',
  reduce: (task, event, now) => withRunningRoot(transitionTaskBatchItem(task, event.itemId, { status: 'sending', error: null, updatedAt: now }), null, now)
};

export const itemRunningHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'item-running' }>> = {
  type: 'item-running',
  reduce: (task, event, now) => withRunningRoot(transitionTaskBatchItem(task, event.itemId, { status: 'running', error: null, updatedAt: now }), event.aggregateError, now)
};

export const itemProgressHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'item-progress' }>> = {
  type: 'item-progress',
  reduce(task, event, now) {
    const updated = transitionTaskBatchItem(task, event.itemId, { status: 'running', error: null, updatedAt: now });
    return {
      ...withRunningRoot(updated, event.aggregateError, now),
      progress: event.progress,
      batch: updated.batch ? {
        ...updated.batch,
        items: updated.batch.items.map((item) => item.id === event.itemId ? { ...item, progress: event.progress } : item)
      } : updated.batch
    };
  }
};

export const itemStreamedHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'item-streamed' }>> = {
  type: 'item-streamed',
  reduce(task, event, now) {
    const updated = transitionTaskBatchItem(task, event.itemId, { status: 'running', updatedAt: now });
    return {
      ...updated,
      status: 'running',
      updatedAt: now,
      images: upsertLiveStreamingImage(task.images, event.image),
      batch: updated.batch ? {
        ...updated.batch,
        items: updated.batch.items.map((item) => item.id === event.itemId ? { ...item, images: upsertLiveStreamingImage(item.images, event.image) } : item)
      } : updated.batch
    };
  }
};

export const itemRetryingHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'item-retrying' }>> = {
  type: 'item-retrying',
  reduce: (task, event, now) => withRunningRoot(transitionTaskBatchItem(task, event.itemId, { status: 'retrying', error: event.retryText, updatedAt: now }), event.aggregateError, now)
};

export const itemSucceededHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'item-succeeded' }>> = {
  type: 'item-succeeded',
  reduce(task, event, now) {
    const updated = transitionTaskBatchItem(task, event.itemId, { status: 'succeeded', error: null, updatedAt: now });
    const shouldReplaceStreamedImages = event.streamed && event.images.length > 0;
    return {
      ...updated,
      status: 'running',
      updatedAt: now,
      images: shouldReplaceStreamedImages ? replaceImagesForBatchItem(task.images, event.itemId, event.images) : event.streamed ? task.images : [...task.images, ...event.images],
      batch: updated.batch ? {
        ...updated.batch,
        items: updated.batch.items.map((item) => item.id === event.itemId ? {
          ...item,
          images: shouldReplaceStreamedImages ? event.images : event.streamed ? item.images : event.images,
          raw: event.raw
        } : item)
      } : updated.batch
    };
  }
};

export const itemFailedHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'item-failed' }>> = {
  type: 'item-failed',
  reduce: (task, event, now) => withRunningRoot(transitionTaskBatchItem(task, event.itemId, { status: 'failed', error: event.error, updatedAt: now }), event.aggregateError, now)
};

export const itemCancelledHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'item-cancelled' }>> = {
  type: 'item-cancelled',
  reduce: (task, event, now) => withRunningRoot(transitionTaskBatchItem(task, event.itemId, { status: 'cancelled', error: event.error, updatedAt: now }), event.aggregateError, now)
};

export const activeItemsCancelledHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'active-items-cancelled' }>> = {
  type: 'active-items-cancelled',
  reduce: (task, event, now) => withActiveItemsCancelled(task, event.error, now)
};

export const batchFinishedHandler: BatchTaskReducerHandler<Extract<KnownBatchTaskReducerEvent, { type: 'batch-finished' }>> = {
  type: 'batch-finished',
  reduce: (task, event, now) => transitionTask(task, { status: event.status, error: event.error, updatedAt: now })
};

function withActiveItemsCancelled(task: GenerationTask, error: string, now: number): GenerationTask {
  const nextItems = task.batch?.items.map((item) => isActiveGenerationStatus(item.status)
    ? { ...item, status: 'cancelled' as GenerationStatus, updatedAt: now, error }
    : item);
  return {
    ...transitionTask(task, { status: 'cancelled', error, updatedAt: now }),
    batch: task.batch ? { ...task.batch, items: nextItems ?? task.batch.items } : task.batch
  };
}

function replaceImagesForBatchItem(current: GeneratedImage[], itemId: string, next: GeneratedImage[]): GeneratedImage[] {
  return [...current.filter((image) => image.batchItemId !== itemId), ...next].sort((a, b) => a.index - b.index || a.createdAt - b.createdAt);
}

function withRunningRoot(task: GenerationTask, aggregateError: string | null, updatedAt: number): GenerationTask {
  return {
    ...task,
    status: 'running',
    updatedAt,
    error: aggregateError || null
  };
}
