import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSyncedDocumentState,
  type SyncDocumentDescriptor
} from '../src/processes/storage-sync/documentSyncEngine';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function createHarness(options: { fallback?: string; remote?: Promise<string> } = {}) {
  const fallbackWrites: string[] = [];
  const remoteWrites: string[] = [];
  const remoteSaves: Array<{ value: string; gate: ReturnType<typeof deferred<void>> }> = [];
  const descriptor: SyncDocumentDescriptor<string> = {
    id: 'test-document',
    loadFallback: () => options.fallback ?? 'fallback',
    saveFallback: (value) => fallbackWrites.push(value),
    loadRemote: () => options.remote ?? Promise.resolve('remote'),
    saveRemote: (value) => {
      remoteWrites.push(value);
      const gate = deferred<void>();
      remoteSaves.push({ value, gate });
      return gate.promise;
    },
    normalize: (value) => value.trim().toLowerCase(),
    messages: {
      loadRemoteFailed: 'load failed',
      saveRemoteFailed: 'save failed'
    }
  };
  return { descriptor, fallbackWrites, remoteWrites, remoteSaves };
}

test('fallback is visible synchronously before remote hydration resolves', () => {
  const remote = deferred<string>();
  const harness = createHarness({ fallback: ' FALLBACK ', remote: remote.promise });
  const state = createSyncedDocumentState(harness.descriptor, undefined);

  assert.deepEqual(state.getSnapshot(), { value: 'fallback', hydration: 'loading', warning: null });
});

test('remote hydration applies without local edits and updates fallback', async () => {
  const harness = createHarness({ fallback: 'fallback', remote: Promise.resolve(' REMOTE ') });
  const state = createSyncedDocumentState(harness.descriptor, undefined);

  await state.hydrate();

  assert.deepEqual(state.getSnapshot(), { value: 'remote', hydration: 'ready', warning: null });
  assert.deepEqual(harness.fallbackWrites, ['remote']);
  assert.deepEqual(harness.remoteWrites, []);
});

test('local edit during hydration wins and is persisted remotely', async () => {
  const remote = deferred<string>();
  const harness = createHarness({ fallback: 'fallback', remote: remote.promise });
  const state = createSyncedDocumentState(harness.descriptor, undefined);

  const hydration = state.hydrate();
  state.setValue(' LOCAL ');
  remote.resolve('remote');
  await hydration;

  assert.equal(state.getSnapshot().value, 'local');
  assert.equal(harness.remoteWrites[0], 'local');
  harness.remoteSaves[0].gate.resolve();
  await state.flushForTests();
});

test('remote saves are serialized and intermediate pending values coalesce', async () => {
  const harness = createHarness();
  const state = createSyncedDocumentState(harness.descriptor, undefined);

  state.setValue('A');
  state.setValue('B');
  state.setValue('C');
  assert.deepEqual(harness.remoteWrites, ['a']);

  harness.remoteSaves[0].gate.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(harness.remoteWrites, ['a', 'c']);

  harness.remoteSaves[1].gate.resolve();
  await state.flushForTests();
});

test('save failure degrades state but a later edit retries', async () => {
  const harness = createHarness();
  const state = createSyncedDocumentState(harness.descriptor, undefined);

  state.setValue('A');
  harness.remoteSaves[0].gate.reject(new Error('nope'));
  await state.flushForTests();
  assert.equal(state.getSnapshot().hydration, 'degraded');
  assert.equal(state.getSnapshot().warning, 'save failed');

  state.setValue('B');
  assert.deepEqual(harness.remoteWrites, ['a', 'b']);
  harness.remoteSaves[1].gate.resolve();
  await state.flushForTests();
  assert.equal(state.getSnapshot().hydration, 'ready');
});

test('normalize is applied to fallback, remote and local values', async () => {
  const harness = createHarness({ fallback: ' FALLBACK ', remote: Promise.resolve(' REMOTE ') });
  const state = createSyncedDocumentState(harness.descriptor, undefined);
  assert.equal(state.getSnapshot().value, 'fallback');
  await state.hydrate();
  assert.equal(state.getSnapshot().value, 'remote');
  state.setValue(' LOCAL ');
  assert.equal(state.getSnapshot().value, 'local');
  harness.remoteSaves[0].gate.resolve();
  await state.flushForTests();
});

test('dispose prevents late hydration notifications', async () => {
  const remote = deferred<string>();
  const harness = createHarness({ remote: remote.promise });
  const state = createSyncedDocumentState(harness.descriptor, undefined);
  let notifications = 0;
  state.subscribe(() => { notifications += 1; });

  const hydration = state.hydrate();
  state.dispose();
  remote.resolve('remote');
  await hydration;

  assert.equal(notifications, 0);
});
