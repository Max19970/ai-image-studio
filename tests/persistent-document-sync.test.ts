import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams, defaultStudioSettings } from '../src/domain/defaults';
import type { ImageParams } from '../src/domain/imageParams';
import type { StudioSettings } from '../src/domain/studioSettings';
import { createSyncedDocumentState } from '../src/processes/storage-sync/documentSyncEngine';
import { createImageParamsSyncDescriptor } from '../src/processes/storage-sync/imageParams';
import { createStudioSettingsSyncDescriptor } from '../src/processes/storage-sync/studioSettings';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

test('studio settings local edit during delayed remote hydration wins', async () => {
  const remote = deferred<StudioSettings>();
  const remoteWrites: StudioSettings[] = [];
  const descriptor = createStudioSettingsSyncDescriptor({
    fallback: {
      load: () => defaultStudioSettings,
      save: () => undefined
    },
    remote: {
      load: () => remote.promise,
      save: async (value) => { remoteWrites.push(value); }
    }
  });
  const state = createSyncedDocumentState(descriptor, undefined);

  const hydration = state.hydrate();
  state.setValue((current) => ({ ...current, maxStoredGenerationTasks: 321 }));
  remote.resolve({ ...defaultStudioSettings, maxStoredGenerationTasks: 99 });
  await hydration;
  await state.flushForTests();

  assert.equal(state.getSnapshot().value.maxStoredGenerationTasks, 321);
  assert.equal(remoteWrites.at(-1)?.maxStoredGenerationTasks, 321);
});

test('image params prompt edit during delayed load is not lost', async () => {
  const remote = deferred<ImageParams>();
  const remoteWrites: ImageParams[] = [];
  const descriptor = createImageParamsSyncDescriptor({
    fallback: {
      load: () => defaultImageParams,
      save: () => undefined
    },
    remote: {
      load: () => remote.promise,
      save: async (value) => { remoteWrites.push(value); }
    }
  });
  const state = createSyncedDocumentState(descriptor, undefined);

  const hydration = state.hydrate();
  state.setValue((current) => ({ ...current, prompt: 'local prompt' }));
  remote.resolve({ ...defaultImageParams, prompt: 'remote prompt' });
  await hydration;
  await state.flushForTests();

  assert.equal(state.getSnapshot().value.prompt, 'local prompt');
  assert.equal(remoteWrites.at(-1)?.prompt, 'local prompt');
});

test('successive params edits persist the latest version last', async () => {
  const gates: Array<ReturnType<typeof deferred<void>>> = [];
  const remoteWrites: string[] = [];
  const descriptor = createImageParamsSyncDescriptor({
    fallback: { load: () => defaultImageParams, save: () => undefined },
    remote: {
      load: async () => defaultImageParams,
      save: (value) => {
        remoteWrites.push(value.prompt);
        const gate = deferred<void>();
        gates.push(gate);
        return gate.promise;
      }
    }
  });
  const state = createSyncedDocumentState(descriptor, undefined);

  state.setValue((current) => ({ ...current, prompt: 'first' }));
  state.setValue((current) => ({ ...current, prompt: 'second' }));
  state.setValue((current) => ({ ...current, prompt: 'latest' }));
  assert.deepEqual(remoteWrites, ['first']);
  gates[0].resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(remoteWrites, ['first', 'latest']);
  gates[1].resolve();
  await state.flushForTests();
});
