import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDelayedParallelSchedule,
  createRunnerRetryPolicy,
  createTaskCancellationRegistry,
  interruptedStatusToFailed,
  isActiveGenerationStatus,
  normalizeGenerationStatus,
  runWithRetryPolicy
} from '../src/processes/generation-task-lifecycle';
import {
  createPersistableGenerationTaskHistorySnapshot,
  getGenerationTaskHistoryPersistenceSignature,
  shouldPersistGenerationTaskHistory
} from '../src/processes/storage-sync/generationTaskHistory';
import { normalizeGenerationTasks } from '../src/entities/storage';

test('generation lifecycle normalizes old statuses and classifies active work', () => {
  assert.equal(normalizeGenerationStatus('streaming'), 'running');
  assert.equal(normalizeGenerationStatus('wat'), 'failed');
  assert.equal(interruptedStatusToFailed('queued'), 'failed');
  assert.equal(interruptedStatusToFailed('succeeded'), 'succeeded');
  assert.equal(isActiveGenerationStatus('retrying'), true);
  assert.equal(isActiveGenerationStatus('cancelled'), false);
});

test('generation history persistence waits until active previews finish', () => {
  assert.equal(shouldPersistGenerationTaskHistory([{ id: 'task-1', status: 'running' } as any]), false);
  assert.equal(shouldPersistGenerationTaskHistory([{ id: 'task-1', status: 'retrying' } as any]), false);
  assert.equal(shouldPersistGenerationTaskHistory([{ id: 'task-1', status: 'succeeded' } as any]), true);
  assert.equal(shouldPersistGenerationTaskHistory([{ id: 'task-1', status: 'failed' } as any]), true);
});

test('generation history persistence snapshots finished images even while other work is active', () => {
  const request = { prompt: '', createdAt: 1, mode: 'generate', endpoint: '', providerLabel: '', model: '', modelLabel: '', payload: {}, warnings: [], attachments: [], params: {} };
  const image = { id: 'image-1', src: 'data:image/png;base64,QUJDRA==', format: 'png', kind: 'final', index: 0, createdAt: 10 };

  const snapshot = createPersistableGenerationTaskHistorySnapshot([
    { id: 'done', kind: 'single', status: 'succeeded', createdAt: 1, updatedAt: 2, request, images: [image] },
    { id: 'active-empty', kind: 'single', status: 'running', createdAt: 3, updatedAt: 4, request, images: [] },
    { id: 'active-with-image', kind: 'single', status: 'running', createdAt: 5, updatedAt: 6, request, images: [{ ...image, id: 'image-2' }] }
  ] as any);

  assert.deepEqual(snapshot.map((task) => task.id), ['done', 'active-with-image']);
  assert.equal(snapshot[1].status, 'failed');
  assert.equal(shouldPersistGenerationTaskHistory(snapshot), true);
  assert.equal(getGenerationTaskHistoryPersistenceSignature(snapshot).includes('image-2'), true);
});

test('generation history persistence keeps terminal reload failures but drops active empty placeholders', () => {
  const request = { prompt: '', createdAt: 1, mode: 'generate', endpoint: '', providerLabel: '', model: '', modelLabel: '', payload: {}, warnings: [], attachments: [], params: {} };

  const snapshot = createPersistableGenerationTaskHistorySnapshot([
    { id: 'active-empty', kind: 'single', status: 'running', createdAt: 1, updatedAt: 2, request, images: [] },
    { id: 'failed-reload', kind: 'single', status: 'failed', createdAt: 3, updatedAt: 4, request, images: [], error: 'Interrupted by page reload.' }
  ] as any);

  assert.deepEqual(snapshot.map((task) => task.id), ['failed-reload']);
  assert.equal(snapshot[0].status, 'failed');
  assert.equal(snapshot[0].error, 'Interrupted by page reload.');
});

test('generation history normalization deduplicates tasks by id', () => {
  const request = { prompt: 'first', createdAt: 1, mode: 'generate', endpoint: '', providerLabel: '', model: '', modelLabel: '', payload: {}, warnings: [], attachments: [], params: {} };
  const secondRequest = { ...request, prompt: 'second' };

  const normalized = normalizeGenerationTasks([
    { id: 'task-1', kind: 'single', status: 'failed', createdAt: 1, updatedAt: 2, request, images: [] },
    { id: 'task-1', kind: 'single', status: 'failed', createdAt: 3, updatedAt: 4, request: secondRequest, images: [] }
  ]);

  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].request.prompt, 'first');
});

test('task cancellation registry aborts and releases controllers', () => {
  const registry = createTaskCancellationRegistry();
  const first = new AbortController();
  const second = new AbortController();

  registry.register('first', first);
  registry.register('second', second);
  assert.equal(registry.activeCount(), 2);

  assert.equal(registry.cancel('first'), true);
  assert.equal(first.signal.aborted, true);
  assert.equal(registry.activeCount(), 1);

  registry.release('second');
  assert.equal(registry.activeCount(), 0);
  assert.equal(second.signal.aborted, false);
  assert.equal(registry.cancel('missing'), false);
});

test('delayed parallel schedule uses intervals between send starts', () => {
  assert.deepEqual(createDelayedParallelSchedule(['a', 'b', 'c'], 250).map((task) => task.delayMs), [0, 250, 500]);
  assert.deepEqual(createDelayedParallelSchedule(['a', 'b'], -5).map((task) => task.delayMs), [0, 0]);
});

test('retry policy clamps input and retries non-abort errors', async () => {
  const policy = createRunnerRetryPolicy({ attempts: 99, delaySeconds: -1 });
  assert.equal(policy.extraAttempts, 10);
  assert.equal(policy.delayMs, 0);

  let calls = 0;
  const result = await runWithRetryPolicy({
    policy: createRunnerRetryPolicy({ attempts: 2, delaySeconds: 0 }),
    run: async () => {
      calls += 1;
      if (calls < 3) throw new Error(`fail-${calls}`);
      return 'ok';
    }
  });

  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('retry policy does not retry abort errors', async () => {
  let calls = 0;
  await assert.rejects(
    runWithRetryPolicy({
      policy: createRunnerRetryPolicy({ attempts: 3, delaySeconds: 0 }),
      run: async () => {
        calls += 1;
        throw new DOMException('Request was cancelled.', 'AbortError');
      }
    }),
    /Request was cancelled/
  );
  assert.equal(calls, 1);
});
