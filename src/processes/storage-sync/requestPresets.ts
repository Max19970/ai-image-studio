import { normalizeRequestPresets } from '../../entities/request-presets';
import type { RequestPreset } from '../../entities/request-presets';
import { localRequestPresetStore } from '../../infrastructure/storage/localRequestPresetStore';
import { remoteRequestPresetStore } from '../../infrastructure/storage/remoteRequestPresetStore';
import { createSyncDocumentRuntime, voidContext, type SyncDocumentDescriptor } from './documentSyncEngine';

export const requestPresetsSyncDescriptor = {
  id: 'request-presets',
  loadFallback: () => localRequestPresetStore.load(),
  saveFallback: (presets) => localRequestPresetStore.save(presets),
  loadRemote: () => remoteRequestPresetStore.load(),
  saveRemote: (presets) => remoteRequestPresetStore.save(presets),
  normalize: (presets) => normalizeRequestPresets(presets),
  messages: {
    loadRemoteFailed: 'Could not load request presets from encrypted storage. Using local presets fallback.',
    saveRemoteFailed: 'Could not persist request presets to encrypted storage. Local presets fallback was updated.'
  }
} satisfies SyncDocumentDescriptor<RequestPreset[]>;

const requestPresetsSync = createSyncDocumentRuntime(requestPresetsSyncDescriptor);

export function loadRequestPresets(): RequestPreset[] {
  return requestPresetsSync.loadFallback(voidContext());
}

export function loadRequestPresetsFromDatabase(): Promise<RequestPreset[]> {
  return requestPresetsSync.loadFromRemote(voidContext());
}

export function saveRequestPresets(presets: RequestPreset[]) {
  requestPresetsSync.save(presets, voidContext());
}
