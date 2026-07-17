import test from 'node:test';
import assert from 'node:assert/strict';
import type { GenerationTask } from '../src/domain/generationTask';
import {
  maxStoredGenerationTasks,
  minStoredGenerationTasks,
  normalizeMaxStoredGenerationTasks,
  retainGenerationTasksByCompletedLimit
} from '../src/domain/generationHistorySettings';
import { localGenerationTaskCache, localGenerationTaskFallbackLimit, setGenerationTaskCacheNamespace } from '../src/infrastructure/storage/localGenerationTaskCache';

function task(id: string, status: GenerationTask['status'], createdAt: number): GenerationTask {
  return {
    id,
    kind: 'single',
    status,
    createdAt,
    updatedAt: createdAt,
    request: {
      createdAt,
      mode: 'generate',
      prompt: id,
      endpoint: '/api/test',
      providerLabel: 'Test provider',
      model: 'image-model',
      modelLabel: 'image-model',
      payload: {},
      warnings: [],
      attachments: [],
      params: {}
    },
    images: []
  } as GenerationTask;
}

test('completed retention preserves active tasks and input order', () => {
  const tasks = [
    task('terminal-new', 'succeeded', 5),
    task('active-new', 'running', 4),
    task('terminal-middle', 'failed', 3),
    task('active-old', 'queued', 2),
    task('terminal-old', 'cancelled', 1)
  ];

  assert.deepEqual(
    retainGenerationTasksByCompletedLimit(tasks, 2).map((item) => item.id),
    ['terminal-new', 'active-new', 'terminal-middle', 'active-old']
  );
});

test('active tasks do not consume completed retention capacity', () => {
  const tasks = [
    task('active-1', 'running', 4),
    task('active-2', 'retrying', 3),
    task('active-3', 'sending', 2),
    task('terminal', 'failed', 1)
  ];

  assert.deepEqual(retainGenerationTasksByCompletedLimit(tasks, 1).map((item) => item.id), tasks.map((item) => item.id));
});

test('unknown status is treated as terminal after normalization', () => {
  const tasks = [
    task('unknown', 'future-status' as GenerationTask['status'], 2),
    task('failed', 'failed', 1)
  ];

  assert.deepEqual(retainGenerationTasksByCompletedLimit(tasks, 1).map((item) => item.id), ['unknown']);
});

test('completed limit normalizes to configured bounds', () => {
  assert.equal(normalizeMaxStoredGenerationTasks(0), minStoredGenerationTasks);
  assert.equal(normalizeMaxStoredGenerationTasks(maxStoredGenerationTasks + 1), maxStoredGenerationTasks);
  assert.equal(normalizeMaxStoredGenerationTasks('invalid', 77), 77);
});

test('browser fallback never exceeds its independent light snapshot cap', () => {
  const storage = new Map<string, string>();
  const previousLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key)
    }
  });

  try {
    setGenerationTaskCacheNamespace('retention-test');
    const tasks = Array.from({ length: localGenerationTaskFallbackLimit + 25 }, (_, index) => task(`task-${index}`, 'failed', index));
    localGenerationTaskCache.save(tasks);
    assert.equal(localGenerationTaskCache.loadSync().length, localGenerationTaskFallbackLimit);
  } finally {
    setGenerationTaskCacheNamespace(null);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousLocalStorage });
  }
});
