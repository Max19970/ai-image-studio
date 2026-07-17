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
import type { RuntimeTaskRetentionPolicyPort } from '../server/processes/generation-task-runtime/runtimeRetentionPolicy';
import type { LiveGenerationImageStore } from '../server/processes/liveGenerationImageAssets';

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
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
  serializeTasks: (tasks) => tasks
};

const events: RuntimeTaskEventPublisherPort = {
  hasClients: () => false,
  currentRevision: () => 0,
  nextRevision: () => 1,
  broadcastTasksDelta: () => undefined,
  broadcastTaskUpsert: () => undefined
};

const retentionPolicy: RuntimeTaskRetentionPolicyPort = {
  getCompletedTaskLimit: () => 1000
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

test('runtime initialization is shared across concurrent readers', async () => {
  const loadResult = deferred<GenerationTask[]>();
  let loadCalls = 0;
  const persistence: RuntimeTaskPersistencePort = {
    async load() {
      loadCalls += 1;
      return loadResult.promise;
    },
    async save() {}
  };
  const store = createGenerationTaskRuntimeStore(persistence, serialization, events, retentionPolicy);

  const first = store.ensureRuntimeTasks();
  const second = store.ensureRuntimeTasks();
  loadResult.resolve([failedTask('loaded', 1)]);

  assert.deepEqual((await first).map((task) => task.id), ['loaded']);
  assert.deepEqual((await second).map((task) => task.id), ['loaded']);
  assert.equal(loadCalls, 1);
});

test('runtime initialization retries after a failed load', async () => {
  let loadCalls = 0;
  const persistence: RuntimeTaskPersistencePort = {
    async load() {
      loadCalls += 1;
      if (loadCalls === 1) throw new Error('first load failed');
      return [failedTask('loaded', 1)];
    },
    async save() {}
  };
  const store = createGenerationTaskRuntimeStore(persistence, serialization, events, retentionPolicy);

  await assert.rejects(store.ensureRuntimeTasks(), /first load failed/);
  assert.deepEqual((await store.ensureRuntimeTasks()).map((task) => task.id), ['loaded']);
  assert.equal(loadCalls, 2);
});

test('runtime mutation waits for initialization and applies to the loaded state', async () => {
  const loadResult = deferred<GenerationTask[]>();
  const persistence: RuntimeTaskPersistencePort = {
    load: () => loadResult.promise,
    async save() {}
  };
  const store = createGenerationTaskRuntimeStore(persistence, serialization, events, retentionPolicy);

  const mutation = store.prependTask(failedTask('new', 2), { persist: false });
  loadResult.resolve([failedTask('stored', 1)]);
  await mutation;

  assert.deepEqual((await store.ensureRuntimeTasks()).map((task) => task.id), ['new', 'stored']);
});

test('runtime load uses configured completed limit and preserves active tasks beyond it', async () => {
  const loaded = [
    failedTask('terminal-new', 4),
    { ...failedTask('active', 3), status: 'running' as const },
    failedTask('terminal-old', 2)
  ];
  let requestedLimit = 0;
  const persistence: RuntimeTaskPersistencePort = {
    async load(completedLimit) {
      requestedLimit = completedLimit;
      return loaded;
    },
    async save() {}
  };
  const policy: RuntimeTaskRetentionPolicyPort = { getCompletedTaskLimit: () => 1 };
  const store = createGenerationTaskRuntimeStore(persistence, serialization, events, policy);

  assert.deepEqual((await store.ensureRuntimeTasks()).map((task) => task.id), ['terminal-new', 'active']);
  assert.equal(requestedLimit, 1);
});

test('runtime mutation removes only the oldest completed task at the configured limit', async () => {
  const initial = Array.from({ length: 1000 }, (_, index) => failedTask(`terminal-${index}`, 1000 - index));
  const persistence: RuntimeTaskPersistencePort = {
    async load() { return initial; },
    async save() {}
  };
  const policy: RuntimeTaskRetentionPolicyPort = { getCompletedTaskLimit: () => 1000 };
  const store = createGenerationTaskRuntimeStore(persistence, serialization, events, policy);

  await store.prependTask(failedTask('newest', 1001), { persist: false });
  const retained = await store.ensureRuntimeTasks();
  assert.equal(retained.length, 1000);
  assert.equal(retained[0].id, 'newest');
  assert.equal(retained.at(-1)?.id, 'terminal-998');
  assert.equal(retained.some((task) => task.id === 'terminal-999'), false);
});

test('atomic gallery mutation keeps runtime memory and SSE unchanged when persistence fails', async () => {
  let revisions = 0;
  let broadcasts = 0;
  const publishingEvents: RuntimeTaskEventPublisherPort = {
    hasClients: () => true,
    currentRevision: () => revisions,
    nextRevision: () => ++revisions,
    broadcastTasksDelta: () => { broadcasts += 1; },
    broadcastTaskUpsert: () => { broadcasts += 1; }
  };
  const persistence: RuntimeTaskPersistencePort = {
    load: async () => [failedTask('stored', 1)],
    async save() {}
  };
  const store = createGenerationTaskRuntimeStore(persistence, serialization, publishingEvents, retentionPolicy);

  await assert.rejects(
    () => store.commitGalleryMutation(
      async (tasks) => ({ tasks: [failedTask('new', 2), ...tasks], payload: undefined, result: 'never' }),
      async () => { throw new Error('atomic persistence failed'); }
    ),
    /atomic persistence failed/
  );

  assert.deepEqual((await store.ensureRuntimeTasks()).map((task) => task.id), ['stored']);
  assert.equal(revisions, 0);
  assert.equal(broadcasts, 0);
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

  const store = createGenerationTaskRuntimeStore(persistence, serialization, events, retentionPolicy);
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
