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
import { shouldPersistGenerationTaskHistory } from '../src/processes/storage-sync';

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
