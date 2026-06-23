import { normalizeGalleryPath, normalizeGalleryPaths } from '../../../src/domain/galleryFilesystem';
import type { BatchGenerationItem, GeneratedImage, GenerationRequestSnapshot, GenerationStatus, GenerationTask } from '../../../src/domain/generationTask';
import { reduceBatchTask, type BatchTaskReducerEvent } from '../../../src/processes/batch-runner/batchTaskReducer';
import { runDelayedParallelScheduler } from '../../../src/processes/generation-task-lifecycle/scheduler';
import {
  abortBatchItemControllers,
  clearBatchTaskRuntime,
  isBatchItemCancellationRequested,
  registerBatchItemController,
  registerTaskController,
  unregisterBatchItemController,
  unregisterTaskController
} from './cancellation';
import { isActiveStatus, normalizeError, sortImages, uid } from './imageState';
import { runGenerationRequestPipeline, type ServerGenerationRunInput } from './providerPipeline';
import { mutateTasks, patchTask } from './runtimeStore';

export interface ServerBatchGenerationRunInput {
  items: ServerGenerationRunInput[];
  intervalMs: number;
  aggregateSnapshot?: GenerationRequestSnapshot | null;
  galleryPath?: string;
}

function createBatchAggregateSnapshot(input: ServerBatchGenerationRunInput, createdAt: number): GenerationRequestSnapshot {
  if (input.aggregateSnapshot) return input.aggregateSnapshot;
  const first = input.items[0]?.snapshot;
  return {
    createdAt,
    mode: first?.mode ?? 'generate',
    prompt: `Batch request · ${input.items.length} item${input.items.length === 1 ? '' : 's'}`,
    endpoint: 'server:batch',
    providerLabel: 'Mixed providers',
    providerAdapterId: 'server-batch',
    model: 'batch',
    modelLabel: 'Batch',
    payload: {},
    warnings: [],
    attachments: [],
    params: {},
    aggregate: {
      kind: 'batch',
      itemCount: input.items.length,
      intervalMs: input.intervalMs
    }
  };
}

function createBatchTask(input: ServerBatchGenerationRunInput): GenerationTask {
  const createdAt = Date.now();
  const taskId = uid('task');
  const items: BatchGenerationItem[] = input.items.map((item, index) => ({
    id: uid('batch-item'),
    index,
    status: 'queued',
    request: item.snapshot,
    images: []
  }));
  return {
    id: taskId,
    kind: 'batch',
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    galleryPath: normalizeGalleryPath(input.galleryPath),
    galleryPaths: normalizeGalleryPaths(undefined, input.galleryPath),
    request: createBatchAggregateSnapshot(input, createdAt),
    images: [],
    batch: {
      intervalMs: input.intervalMs,
      items
    },
    error: null
  };
}

function batchTerminal(task: GenerationTask): { status: GenerationStatus; error: string | null } {
  const items = task.batch?.items ?? [];
  if (items.some((item) => isActiveStatus(item.status))) return { status: 'running', error: task.error ?? null };
  const succeeded = items.filter((item) => item.status === 'succeeded').length;
  const failed = items.filter((item) => item.status === 'failed').length;
  const cancelled = items.filter((item) => item.status === 'cancelled').length;
  if (succeeded > 0) return { status: 'succeeded', error: failed + cancelled > 0 ? `${failed + cancelled} batch item${failed + cancelled === 1 ? '' : 's'} did not complete.` : null };
  if (cancelled > 0 && failed === 0) return { status: 'cancelled', error: 'Batch request was cancelled.' };
  return { status: 'failed', error: failed > 0 ? 'All batch items failed.' : 'Batch request did not produce images.' };
}

function attachBatchImage(image: GeneratedImage, taskId: string, item: BatchGenerationItem, itemIndex: number, index: number, snapshot: GenerationRequestSnapshot): GeneratedImage {
  return {
    ...image,
    taskId,
    batchItemId: item.id,
    batchItemIndex: itemIndex,
    index,
    request: snapshot
  };
}

async function dispatchBatchEvent(taskId: string, event: BatchTaskReducerEvent, persist = true) {
  await patchTask(taskId, (task) => reduceBatchTask(task, event), { persist });
}

async function runServerBatchItem(args: {
  taskId: string;
  item: ServerGenerationRunInput;
  batchItem: BatchGenerationItem;
  itemIndex: number;
  controller: AbortController;
  reserveFinalIndex: () => number;
}) {
  const { taskId, item, batchItem, itemIndex, controller, reserveFinalIndex } = args;
  await runGenerationRequestPipeline({
    input: item,
    signal: controller.signal,
    handlers: {
      attachImage: (image) => {
        const index = image.kind === 'partial' ? itemIndex * 1000 : reserveFinalIndex();
        return attachBatchImage(image, taskId, batchItem, itemIndex, index, item.snapshot);
      },
      onSending: () => dispatchBatchEvent(taskId, { type: 'item-sending', itemId: batchItem.id }, false),
      onRunning: () => dispatchBatchEvent(taskId, { type: 'item-running', itemId: batchItem.id, aggregateError: null }, false),
      onRetry: ({ attempt, totalAttempts, error, waitMs }) => dispatchBatchEvent(taskId, {
        type: 'item-retrying',
        itemId: batchItem.id,
        retryText: `Retry ${attempt}/${totalAttempts} in ${Math.round(waitMs / 1000)}s: ${error}`,
        aggregateError: null
      }, false),
      onProgress: (progress) => dispatchBatchEvent(taskId, { type: 'item-progress', itemId: batchItem.id, progress, aggregateError: null }, false),
      onImage: (image) => dispatchBatchEvent(taskId, { type: 'item-streamed', itemId: batchItem.id, image }, image.kind === 'final'),
      onSucceeded: ({ images, raw, streamed }) => dispatchBatchEvent(taskId, {
        type: 'item-succeeded',
        itemId: batchItem.id,
        images: sortImages(images),
        raw: streamed ? null : raw,
        streamed
      }),
      onFailed: (error, cancelled) => {
        const message = normalizeError(error);
        return cancelled
          ? dispatchBatchEvent(taskId, { type: 'item-cancelled', itemId: batchItem.id, error: message, aggregateError: null })
          : dispatchBatchEvent(taskId, { type: 'item-failed', itemId: batchItem.id, error: message, aggregateError: message });
      }
    }
  });
}

async function runBatchTask(task: GenerationTask, input: ServerBatchGenerationRunInput, controller: AbortController) {
  let nextFinalIndex = 0;
  const reserveFinalIndex = () => nextFinalIndex++;
  const controllerByItemId = new Map<string, AbortController>();
  const batchItemForIndex = (index: number) => task.batch?.items[index] ?? null;
  const controllerForBatchItem = (item: BatchGenerationItem) => {
    const current = controllerByItemId.get(item.id);
    if (current) return current;
    const next = new AbortController();
    controllerByItemId.set(item.id, next);
    registerBatchItemController(task.id, item.id, next);
    return next;
  };
  const abortItemsOnTaskCancel = () => abortBatchItemControllers(task.id);

  try {
    controller.signal.addEventListener('abort', abortItemsOnTaskCancel, { once: true });
    await dispatchBatchEvent(task.id, { type: 'batch-started' }, false);
    await runDelayedParallelScheduler({
      items: input.items,
      intervalMs: input.intervalMs,
      signal: controller.signal,
      taskSignal: ({ index }) => {
        const batchItem = batchItemForIndex(index);
        return batchItem ? controllerForBatchItem(batchItem).signal : undefined;
      },
      onTaskAbort: async ({ index }) => {
        const batchItem = batchItemForIndex(index);
        if (!batchItem || batchItem.status === 'cancelled') return;
        await dispatchBatchEvent(task.id, {
          type: 'item-cancelled',
          itemId: batchItem.id,
          error: 'Request was cancelled.',
          aggregateError: null
        }, false);
      },
      run: async ({ item, index }) => {
        const batchItem = batchItemForIndex(index);
        if (!batchItem) return;
        const itemController = controllerForBatchItem(batchItem);
        if (itemController.signal.aborted || isBatchItemCancellationRequested(task.id, batchItem.id)) return;
        try {
          await runServerBatchItem({ taskId: task.id, item, batchItem, itemIndex: index, controller: itemController, reserveFinalIndex });
        } finally {
          unregisterBatchItemController(task.id, batchItem.id);
        }
      }
    });

    await patchTask(task.id, (current) => {
      const terminal = batchTerminal(current);
      return reduceBatchTask(current, { type: 'batch-finished', status: terminal.status, error: terminal.error });
    });
  } catch (error) {
    await dispatchBatchEvent(task.id, { type: 'active-items-cancelled', error: normalizeError(error) });
  } finally {
    controller.signal.removeEventListener('abort', abortItemsOnTaskCancel);
    unregisterTaskController(task.id);
    clearBatchTaskRuntime(task.id);
  }
}

export async function startServerBatchGenerationRun(input: ServerBatchGenerationRunInput): Promise<GenerationTask> {
  if (input.items.length === 0) throw new Error('Batch request must contain at least one item.');
  const task = createBatchTask(input);
  const controller = new AbortController();
  registerTaskController(task.id, controller);
  await mutateTasks((tasks) => [task, ...tasks.filter((item) => item.id !== task.id)], { persist: false });
  setImmediate(() => {
    void runBatchTask(task, input, controller);
  });
  return task;
}
