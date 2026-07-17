import { normalizeRequestPresets, type RequestPreset } from '../../entities/request-presets';
import { localRequestPresetStore } from '../../infrastructure/storage/localRequestPresetStore';
import { remoteRequestPresetStore } from '../../infrastructure/storage/remoteRequestPresetStore';
import type { SyncDocumentDescriptor } from './documentSyncEngine';

export interface RequestPresetFallbackStore {
  load(): RequestPreset[];
  save(presets: RequestPreset[]): void;
}

export interface RequestPresetRemoteStore {
  load(): Promise<RequestPreset[]>;
  save(presets: RequestPreset[]): Promise<void>;
}

export function createRequestPresetsSyncDescriptor(stores: {
  fallback: RequestPresetFallbackStore;
  remote: RequestPresetRemoteStore;
}): SyncDocumentDescriptor<RequestPreset[]> {
  return {
    id: 'request-presets',
    loadFallback: () => stores.fallback.load(),
    saveFallback: (presets) => stores.fallback.save(presets),
    loadRemote: () => stores.remote.load(),
    saveRemote: (presets) => stores.remote.save(presets),
    normalize: (presets) => normalizeRequestPresets(presets),
    messages: {
      loadRemoteFailed: 'Could not load request presets from encrypted storage. Using local presets fallback.',
      saveRemoteFailed: 'Could not persist request presets to encrypted storage. Local presets fallback was updated.'
    }
  };
}

export const requestPresetsSyncDescriptor = createRequestPresetsSyncDescriptor({
  fallback: localRequestPresetStore,
  remote: remoteRequestPresetStore
});
