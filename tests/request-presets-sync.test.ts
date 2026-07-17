import test from 'node:test';
import assert from 'node:assert/strict';
import type { RequestPreset } from '../src/entities/request-presets';
import { createSyncedDocumentState } from '../src/processes/storage-sync/documentSyncEngine';
import { createRequestPresetsSyncDescriptor } from '../src/processes/storage-sync/requestPresets';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

function preset(id: string): RequestPreset {
  return {
    id,
    name: id,
    note: '',
    createdAt: 1,
    updatedAt: 1,
    snapshot: {
      providerModeId: 'openai-compatible.image-generate',
      params: { prompt: id },
      selectedModelId: 'model-1'
    },
    meta: {}
  } as RequestPreset;
}

test('request preset edit during delayed remote hydration is not lost', async () => {
  const remote = deferred<RequestPreset[]>();
  const fallbackWrites: RequestPreset[][] = [];
  const remoteWrites: RequestPreset[][] = [];
  const descriptor = createRequestPresetsSyncDescriptor({
    fallback: {
      load: () => [preset('fallback')],
      save: (value) => fallbackWrites.push(value)
    },
    remote: {
      load: () => remote.promise,
      save: async (value) => { remoteWrites.push(value); }
    }
  });
  const state = createSyncedDocumentState(descriptor, undefined);

  const hydration = state.hydrate();
  state.setValue((current) => [...current, preset('local-edit')]);
  remote.resolve([preset('remote')]);
  await hydration;
  await state.flushForTests();

  assert.deepEqual(state.getSnapshot().value.map((item) => item.id), ['fallback', 'local-edit']);
  assert.deepEqual(remoteWrites.at(-1)?.map((item) => item.id), ['fallback', 'local-edit']);
  assert.deepEqual(fallbackWrites.at(-1)?.map((item) => item.id), ['fallback', 'local-edit']);
});
