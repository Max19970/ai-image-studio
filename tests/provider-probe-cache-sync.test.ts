import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultProviderSettings } from '../src/domain/defaults';
import type { ProviderProbeReport } from '../src/domain/providerProbe';
import {
  getCachedProviderProbeReport,
  getProviderFingerprint,
  withCachedProviderProbeReport
} from '../src/entities/provider-probe-cache';
import { createSyncedDocumentState } from '../src/processes/storage-sync/documentSyncEngine';
import { createProviderProbeCacheSyncDescriptor } from '../src/processes/storage-sync/providerProbeCache';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

const providerA = { ...defaultProviderSettings, modelId: 'model-a' };
const providerB = { ...defaultProviderSettings, modelId: 'model-b' };

function report(label: string, fingerprint: string): ProviderProbeReport {
  const entry = { supported: true, status: 'accepted' as const };
  return {
    fingerprint,
    createdAt: 1,
    providerLabel: label,
    baseline: { generation: entry, edit: entry },
    generation: {},
    edit: {}
  };
}

test('one hydrated provider cache map selects the current provider without reloading', async () => {
  let loadCalls = 0;
  const reportA = report('A', getProviderFingerprint(providerA));
  const reportB = report('B', getProviderFingerprint(providerB));
  const descriptor = createProviderProbeCacheSyncDescriptor({
    fallback: { load: () => ({}), save: () => undefined },
    remote: {
      load: async () => {
        loadCalls += 1;
        return { [reportA.fingerprint]: reportA, [reportB.fingerprint]: reportB };
      },
      save: async () => undefined
    }
  });
  const state = createSyncedDocumentState(descriptor, undefined);

  await state.hydrate();
  assert.equal(getCachedProviderProbeReport(state.getSnapshot().value, providerA)?.providerLabel, 'A');
  assert.equal(getCachedProviderProbeReport(state.getSnapshot().value, providerB)?.providerLabel, 'B');
  assert.equal(getCachedProviderProbeReport(state.getSnapshot().value, providerA)?.providerLabel, 'A');
  assert.equal(loadCalls, 1);
});

test('functional provider save preserves reports already stored for other providers', async () => {
  const remote = deferred<Record<string, ProviderProbeReport>>();
  const remoteWrites: Array<Record<string, ProviderProbeReport>> = [];
  const oldB = report('B', getProviderFingerprint(providerB));
  const newA = report('A-new', getProviderFingerprint(providerA));
  const descriptor = createProviderProbeCacheSyncDescriptor({
    fallback: { load: () => ({ [oldB.fingerprint]: oldB }), save: () => undefined },
    remote: {
      load: () => remote.promise,
      save: async (map) => { remoteWrites.push(map); }
    }
  });
  const state = createSyncedDocumentState(descriptor, undefined);

  const hydration = state.hydrate();
  state.setValue((map) => withCachedProviderProbeReport(map, newA));
  remote.resolve({});
  await hydration;
  await state.flushForTests();

  const persisted = remoteWrites.at(-1) ?? {};
  assert.equal(getCachedProviderProbeReport(persisted, providerA)?.providerLabel, 'A-new');
  assert.equal(getCachedProviderProbeReport(persisted, providerB)?.providerLabel, 'B');
});
