import test from 'node:test';
import assert from 'node:assert/strict';
import type { GenerationTask } from '../src/domain/generationTask';
import {
  applyGenerationTasksDelta,
  parseGenerationTasksDeltaEventData,
  parseGenerationTasksEventData
} from '../src/domain/generationTaskEvents';

function task(id: string, status: GenerationTask['status'] = 'queued', updatedAt = 1): GenerationTask {
  return {
    id,
    kind: 'single',
    status,
    createdAt: updatedAt,
    updatedAt,
    request: {
      createdAt: updatedAt,
      mode: 'generate',
      prompt: id,
      endpoint: '/api/test',
      providerLabel: 'Test provider',
      model: 'image-model',
      modelLabel: 'image-model',
      payload: { prompt: id },
      warnings: [],
      attachments: [],
      params: {}
    },
    images: []
  } as GenerationTask;
}

test('generation task event parser accepts snapshots and rejects malformed task payloads', () => {
  assert.deepEqual(parseGenerationTasksEventData(JSON.stringify({ revision: 2, tasks: [task('a')] }))?.tasks.map((item) => item.id), ['a']);
  assert.equal(parseGenerationTasksEventData(JSON.stringify({ revision: 2, tasks: [{}] })), null);
  assert.equal(parseGenerationTasksEventData('not json'), null);
});

test('generation task delta parser accepts compact unordered deltas', () => {
  const parsed = parseGenerationTasksDeltaEventData(JSON.stringify({
    revision: 3,
    upserted: [task('a', 'running', 3)],
    deletedIds: []
  }));

  assert.equal(parsed?.revision, 3);
  assert.equal(parsed?.taskIds, undefined);
  assert.equal(parsed?.upserted[0].id, 'a');
});

test('generation task delta parser preserves ordered deltas for task insertion', () => {
  const parsed = parseGenerationTasksDeltaEventData(JSON.stringify({
    revision: 4,
    taskIds: ['new-task', 'old-task'],
    upserted: [task('new-task')],
    deletedIds: []
  }));

  assert.deepEqual(parsed?.taskIds, ['new-task', 'old-task']);
});

test('generation task reducer applies ordered insertion deltas', () => {
  const current = [task('old-task')];
  const next = applyGenerationTasksDelta(current, {
    revision: 2,
    taskIds: ['new-task', 'old-task'],
    upserted: [task('new-task')],
    deletedIds: []
  });

  assert.deepEqual(next.map((item) => item.id), ['new-task', 'old-task']);
});

test('generation task reducer applies compact progress patches without reordering', () => {
  const current = [task('first'), task('second')];
  const next = applyGenerationTasksDelta(current, {
    revision: 3,
    upserted: [{ ...task('second', 'running', 5), progress: { percent: 50, updatedAt: 5 } } as GenerationTask],
    deletedIds: []
  });

  assert.deepEqual(next.map((item) => item.id), ['first', 'second']);
  assert.equal(next[1].status, 'running');
  assert.equal(next[1].progress?.percent, 50);
});

test('generation task reducer recovers when an unordered patch is the first visible event for a task', () => {
  const next = applyGenerationTasksDelta([], {
    revision: 5,
    upserted: [task('late-visible-task', 'succeeded', 5)],
    deletedIds: []
  });

  assert.deepEqual(next.map((item) => item.id), ['late-visible-task']);
  assert.equal(next[0].status, 'succeeded');
});
