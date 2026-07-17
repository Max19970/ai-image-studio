import test from 'node:test';
import assert from 'node:assert/strict';
import type express from 'express';
import type { GenerationTask } from '../src/domain/generationTask';
import { applyGenerationTasksDelta } from '../src/domain/generationTaskEvents';
import { createGenerationTaskEventBus } from '../server/processes/generation-task-runtime/taskEventBus';
import type { TaskEventClient, TaskEventTransport } from '../server/processes/generation-task-runtime/taskEventTransport';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function task(id: string, updatedAt = 1): GenerationTask {
  return {
    id,
    kind: 'single',
    status: 'queued',
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

interface SentEvent {
  event: string;
  data: any;
}

function createSubscriberHarness() {
  const sent: SentEvent[] = [];
  let closeHandler: (() => void) | null = null;
  const client = {
    writableEnded: false,
    write() { return true; },
    end() { this.writableEnded = true; }
  } as unknown as TaskEventClient;
  const request = {
    on(event: string, handler: () => void) {
      if (event === 'close') closeHandler = handler;
      return this;
    }
  } as unknown as express.Request;
  const transport: TaskEventTransport = {
    prepare() {},
    send(target, event, data) {
      assert.equal(target, client);
      sent.push({ event, data });
    },
    sendKeepAlive() {}
  };
  return {
    sent,
    client,
    request,
    transport,
    close() {
      (client as any).writableEnded = true;
      closeHandler?.();
    }
  };
}

test('subscriber receives snapshot before deltas buffered during snapshot capture', async () => {
  const harness = createSubscriberHarness();
  const bus = createGenerationTaskEventBus(harness.transport);
  const snapshot = deferred<{ revision: number; tasks: GenerationTask[] }>();
  const initial = task('initial', 1);
  const later = task('later', 2);

  bus.subscribe(harness.request, harness.client as unknown as express.Response, () => snapshot.promise);
  const revision = bus.nextRevision();
  bus.broadcastTaskUpsert(later, revision, ['later', 'initial']);
  snapshot.resolve({ revision: 0, tasks: [initial] });
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.deepEqual(harness.sent.map((event) => event.event), ['tasks', 'tasks-delta']);
  assert.equal(harness.sent[0].data.revision, 0);
  assert.equal(harness.sent[1].data.revision, 1);
  assert.deepEqual(
    applyGenerationTasksDelta(harness.sent[0].data.tasks, harness.sent[1].data).map((item) => item.id),
    ['later', 'initial']
  );
});

test('subscriber drops buffered deltas already included in its snapshot', async () => {
  const harness = createSubscriberHarness();
  const bus = createGenerationTaskEventBus(harness.transport);
  const snapshot = deferred<{ revision: number; tasks: GenerationTask[] }>();
  const included = task('included', 2);

  bus.subscribe(harness.request, harness.client as unknown as express.Response, () => snapshot.promise);
  const revision = bus.nextRevision();
  bus.broadcastTaskUpsert(included, revision, ['included']);
  snapshot.resolve({ revision, tasks: [included] });
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.deepEqual(harness.sent.map((event) => event.event), ['tasks']);
  assert.equal(harness.sent[0].data.revision, revision);
});

test('subscriber flushes buffered deltas in strictly increasing revision order', async () => {
  const harness = createSubscriberHarness();
  const bus = createGenerationTaskEventBus(harness.transport);
  const snapshot = deferred<{ revision: number; tasks: GenerationTask[] }>();

  bus.subscribe(harness.request, harness.client as unknown as express.Response, () => snapshot.promise);
  const firstRevision = bus.nextRevision();
  bus.broadcastTaskUpsert(task('first', 1), firstRevision, ['first']);
  const secondRevision = bus.nextRevision();
  bus.broadcastTaskUpsert(task('second', 2), secondRevision, ['second', 'first']);
  snapshot.resolve({ revision: 0, tasks: [] });
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.deepEqual(harness.sent.slice(1).map((event) => event.data.revision), [1, 2]);
});

test('disconnect before snapshot prevents writes and removes subscriber', async () => {
  const harness = createSubscriberHarness();
  const bus = createGenerationTaskEventBus(harness.transport);
  const snapshot = deferred<{ revision: number; tasks: GenerationTask[] }>();

  bus.subscribe(harness.request, harness.client as unknown as express.Response, () => snapshot.promise);
  assert.equal(bus.hasClients(), true);
  harness.close();
  snapshot.resolve({ revision: 0, tasks: [] });
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.equal(bus.hasClients(), false);
  assert.deepEqual(harness.sent, []);
});
