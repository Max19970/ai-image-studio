import test from 'node:test';
import assert from 'node:assert/strict';
import type { GeneratedImage, GenerationRequestSnapshot, GenerationTask } from '../src/domain/generationTask';
import { createBatchRunProgressTracker } from '../src/processes/batch-runner/batchRunProgress';
import { reduceBatchTask } from '../src/processes/batch-runner/batchTaskReducer';

const t = (key: string, params?: Record<string, unknown>) => {
  if (key === 'batch.itemError') return `Item ${params?.index}: ${params?.error}`;
  return key;
};

const snapshot: GenerationRequestSnapshot = {
  createdAt: 1,
  mode: 'generate',
  prompt: 'test',
  endpoint: '/api/generate',
  providerLabel: 'Provider',
  model: 'model',
  modelLabel: 'Model',
  payload: { prompt: 'test' },
  warnings: [],
  attachments: [],
  params: {
    n: 1,
    sizeMode: 'auto',
    sizePreset: 'auto',
    width: 1024,
    height: 1024,
    quality: '',
    background: '',
    moderation: '',
    outputFormat: 'png',
    outputCompression: 100,
    stream: false,
    partialImages: 0,
    responseFormat: '',
    inputFidelity: '',
    user: '',
    style: '',
    rawJson: '',
    retryAttempts: 0,
    retryDelaySeconds: 0
  }
};

function createTask(): GenerationTask {
  return {
    id: 'batch-task',
    kind: 'batch',
    status: 'queued',
    createdAt: 1,
    updatedAt: 1,
    request: snapshot,
    images: [],
    batch: {
      intervalMs: 250,
      items: [0, 1].map((index) => ({
        id: `item-${index}`,
        index,
        status: 'queued',
        request: snapshot,
        images: []
      }))
    }
  };
}

function image(index: number, options: Partial<GeneratedImage> = {}): GeneratedImage {
  return {
    id: options.id ?? `image-${index}`,
    taskId: 'batch-task',
    batchItemId: options.batchItemId ?? 'item-0',
    batchItemIndex: options.batchItemIndex ?? 0,
    src: options.src ?? `data:image/png;base64,${index}`,
    format: 'png',
    kind: options.kind ?? 'final',
    index,
    createdAt: options.createdAt ?? 10 + index,
    request: snapshot
  };
}

test('batch task reducer keeps streamed images attached without final duplication', () => {
  let task = createTask();
  task = reduceBatchTask(task, { type: 'batch-started' }, 2);
  task = reduceBatchTask(task, { type: 'item-running', itemId: 'item-0', aggregateError: null }, 3);
  task = reduceBatchTask(task, { type: 'item-streamed', itemId: 'item-0', image: image(0) }, 4);
  task = reduceBatchTask(task, { type: 'item-succeeded', itemId: 'item-0', images: [image(1)], raw: { ok: true }, streamed: true }, 5);

  assert.equal(task.status, 'running');
  assert.equal(task.images.length, 1);
  assert.equal(task.batch?.items[0].status, 'succeeded');
  assert.equal(task.batch?.items[0].images.length, 1);
  assert.deepEqual(task.batch?.items[0].raw, { ok: true });
});

test('batch task reducer replaces partial previews within their own batch item slot', () => {
  let task = createTask();
  const firstPartial = image(0, { id: 'partial-1', kind: 'partial', src: 'data:image/png;base64,first', createdAt: 20 });
  const secondPartial = image(42, { id: 'partial-2', kind: 'partial', src: 'data:image/png;base64,second', createdAt: 21 });
  const otherItemPartial = image(1, { id: 'partial-other', kind: 'partial', batchItemId: 'item-1', batchItemIndex: 1, src: 'data:image/png;base64,other', createdAt: 22 });

  task = reduceBatchTask(task, { type: 'item-streamed', itemId: 'item-0', image: firstPartial }, 3);
  task = reduceBatchTask(task, { type: 'item-streamed', itemId: 'item-0', image: secondPartial }, 4);
  task = reduceBatchTask(task, { type: 'item-streamed', itemId: 'item-1', image: otherItemPartial }, 5);

  assert.equal(task.images.length, 2);
  assert.equal(task.batch?.items[0].images.length, 1);
  assert.equal(task.batch?.items[0].images[0].id, 'partial-2');
  assert.equal(task.batch?.items[1].images.length, 1);
  assert.equal(task.batch?.items[1].images[0].id, 'partial-other');
});

test('batch task reducer stores item progress on root and batch item', () => {
  let task = createTask();
  task = reduceBatchTask(task, {
    type: 'item-progress',
    itemId: 'item-0',
    aggregateError: null,
    progress: { providerAdapterId: 'comfyui', percent: 40, step: 4, maxSteps: 10, stage: 'sampling', updatedAt: 5 }
  }, 5);

  assert.equal(task.progress?.percent, 40);
  assert.equal(task.batch?.items[0].progress?.stage, 'sampling');
  assert.equal(task.batch?.items[0].status, 'running');
});

test('batch task reducer appends final images for non-streamed items', () => {
  let task = createTask();
  task = reduceBatchTask(task, { type: 'item-succeeded', itemId: 'item-0', images: [image(0), image(1)], raw: null, streamed: false }, 2);

  assert.equal(task.images.length, 2);
  assert.equal(task.batch?.items[0].images.length, 2);
  assert.equal(task.batch?.items[0].status, 'succeeded');
});

test('batch progress tracker resolves success with partial failures when images exist', () => {
  const progress = createBatchRunProgressTracker(2, t);
  progress.recordItemFailure(1, 'provider failed', false);

  const task = createTask();
  const taskWithImage = { ...task, images: [image(0)] };
  const terminal = progress.resolveTerminal(taskWithImage);

  assert.equal(terminal.status, 'succeeded');
  assert.equal(terminal.error, 'Item 2: provider failed');
  assert.equal(terminal.cancelled, false);
});

test('batch progress tracker resolves all-cancelled batch as cancelled', () => {
  const progress = createBatchRunProgressTracker(2, t);
  progress.recordItemFailure(0, 'cancelled', true);
  progress.recordItemFailure(1, 'cancelled', true);

  let task = createTask();
  task = reduceBatchTask(task, { type: 'item-cancelled', itemId: 'item-0', error: 'cancelled', aggregateError: progress.getAggregateError() }, 2);
  task = reduceBatchTask(task, { type: 'item-cancelled', itemId: 'item-1', error: 'cancelled', aggregateError: progress.getAggregateError() }, 3);
  const terminal = progress.resolveTerminal(task);

  assert.equal(terminal.status, 'cancelled');
  assert.equal(terminal.cancelled, true);
});
