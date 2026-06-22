import type { GeneratedImage, GenerationProgress, GenerationStatus, GenerationTask } from '../../domain/generationTask';
import { isActiveGenerationStatus, transitionTask, transitionTaskBatchItem } from '../generation-task-lifecycle';
import { upsertLiveStreamingImage } from '../generation-runner/resultMapper';

export type BatchTaskReducerEvent =
  | { type: 'batch-started' }
  | { type: 'item-sending'; itemId: string }
  | { type: 'item-running'; itemId: string; aggregateError: string | null }
  | { type: 'item-progress'; itemId: string; progress: GenerationProgress; aggregateError: string | null }
  | { type: 'item-streamed'; itemId: string; image: GeneratedImage }
  | { type: 'item-retrying'; itemId: string; retryText: string; aggregateError: string | null }
  | { type: 'item-succeeded'; itemId: string; images: GeneratedImage[]; raw: unknown; streamed: boolean }
  | { type: 'item-failed'; itemId: string; error: string; aggregateError: string }
  | { type: 'item-cancelled'; itemId: string; error: string; aggregateError: string | null }
  | { type: 'active-items-cancelled'; error: string }
  | { type: 'batch-finished'; status: GenerationStatus; error: string | null };

export function reduceBatchTask(task: GenerationTask, event: BatchTaskReducerEvent, now = Date.now()): GenerationTask {
  switch (event.type) {
    case 'batch-started':
      return transitionTask(task, { status: 'running', error: null, updatedAt: now });

    case 'item-sending':
      return withRunningRoot(transitionTaskBatchItem(task, event.itemId, { status: 'sending', error: null, updatedAt: now }), null, now);

    case 'item-running':
      return withRunningRoot(transitionTaskBatchItem(task, event.itemId, { status: 'running', error: null, updatedAt: now }), event.aggregateError, now);

    case 'item-progress': {
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

    case 'item-retrying':
      return withRunningRoot(transitionTaskBatchItem(task, event.itemId, { status: 'retrying', error: event.retryText, updatedAt: now }), event.aggregateError, now);

    case 'item-streamed': {
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

    case 'item-succeeded': {
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

    case 'item-failed':
      return withRunningRoot(transitionTaskBatchItem(task, event.itemId, { status: 'failed', error: event.error, updatedAt: now }), event.aggregateError, now);

    case 'item-cancelled':
      return withRunningRoot(transitionTaskBatchItem(task, event.itemId, { status: 'cancelled', error: event.error, updatedAt: now }), event.aggregateError, now);

    case 'active-items-cancelled': {
      const nextItems = task.batch?.items.map((item) => isActiveGenerationStatus(item.status)
        ? { ...item, status: 'cancelled' as GenerationStatus, updatedAt: now, error: event.error }
        : item);
      return {
        ...transitionTask(task, { status: 'cancelled', error: event.error, updatedAt: now }),
        batch: task.batch ? { ...task.batch, items: nextItems ?? task.batch.items } : task.batch
      };
    }

    case 'batch-finished':
      return transitionTask(task, { status: event.status, error: event.error, updatedAt: now });
  }
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
