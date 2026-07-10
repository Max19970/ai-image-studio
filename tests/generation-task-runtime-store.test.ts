import test from 'node:test';
import assert from 'node:assert/strict';
import type { GenerationTask } from '../src/domain/generationTask';
import {
  createGenerationTaskRuntimeStore,
  type RuntimeTaskEventPublisherPort,
  type RuntimeTaskPersistencePort,
  type RuntimeTaskSerializationPort
} from '../server/processes/generation-task-runtime/runtimeStore';
import { serializeLiveGenerationTaskImagesForClient } from '../server/processes/liveGenerationImageStore';
import type { LiveGenerationImageStore } from '../server/processes/liveGenerationImageAssets';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function failedTask(id: string, updatedAt: number): GenerationTask {
  return {
    id,
    kind: 'single',
    status: 'failed',
    createdAt: updatedAt,
    updatedAt,
    request: {
      createdAt: updatedAt,
      mode: 'generate',
      prompt: id,
      endpoint: '/generate',
      providerLabel: 'Test',
      model: 'test-model',
      modelLabel: 'test-model',
      payload: {},
      warnings: [],
      attachments: [],
      params: {}
    },
    images: [],
    error: 'failed'
  };
}

const serialization: RuntimeTaskSerializationPort = {
  serializeTask: (task) => task,
  serializeTasks: (tasks) => tasks,
  loadClientSnapshot: async () => []
};

const events: RuntimeTaskEventPublisherPort = {
  hasClients: () => false,
  nextRevision: () => 1,
  broadcastTasksDelta: () => undefined,
  broadcastTaskUpsert: () => undefined
};

test('live final images expose their deterministic storage key before the temporary URL expires', () => {
  const task = failedTask('task-1', 1);
  task.status = 'succeeded';
  task.error = null;
  task.images = [{
    id: 'image-1',
    src: 'data:image/png;base64,QUJDRA==',
    format: 'png',
    kind: 'final',
    index: 0,
    createdAt: 1
  }];
  const store: LiveGenerationImageStore = {
    registerSource: () => ({ id: 'live-1', mimeType: 'image/png', bytes: Buffer.from('ABCD'), createdAt: 1, expiresAt: 2 }),
    getAsset: () => null,
    urlFor: () => '/api/generation-tasks/live-images/live-1',
    reset: () => undefined
  };

  const serialized = serializeLiveGenerationTaskImagesForClient(task, store);
  assert.equal(serialized.images[0].src, '/api/generation-tasks/live-images/live-1');
  assert.equal(serialized.images[0].storageAssetKey, 'task-1/image/image-1/full');
});

test('runtime persistence keeps only the latest pending snapshot while a save is in flight', async () => {
  const firstSaveStarted = deferred();
  const releaseFirstSave = deferred();
  const secondSaveStarted = deferred();
  const savedTaskIds: string[][] = [];

  const persistence: RuntimeTaskPersistencePort = {
    load: async () => [],
    save: async (tasks) => {
      savedTaskIds.push(tasks.map((task) => task.id));
      if (savedTaskIds.length === 1) {
        firstSaveStarted.resolve();
        await releaseFirstSave.promise;
      } else if (savedTaskIds.length === 2) {
        secondSaveStarted.resolve();
      }
    }
  };

  const store = createGenerationTaskRuntimeStore(persistence, serialization, events);
  await store.prependTask(failedTask('first', 1));
  await firstSaveStarted.promise;

  await store.prependTask(failedTask('second', 2));
  await store.prependTask(failedTask('third', 3));

  releaseFirstSave.resolve();
  await secondSaveStarted.promise;
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.equal(savedTaskIds.length, 2);
  assert.deepEqual(savedTaskIds[0], ['first']);
  assert.deepEqual(savedTaskIds[1], ['third', 'second', 'first']);
});
