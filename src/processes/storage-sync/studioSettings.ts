import type { StudioSettings } from '../../domain/studioSettings';
import { normalizeStudioSettings } from '../../entities/studio-settings';
import { localStudioSettingsStore } from '../../infrastructure/storage/localStudioSettingsStore';
import { remoteStudioSettingsStore } from '../../infrastructure/storage/remoteStudioSettingsStore';
import type { SyncDocumentDescriptor } from './documentSyncEngine';

export interface StudioSettingsFallbackStore {
  load(): StudioSettings;
  save(settings: StudioSettings): void;
}

export interface StudioSettingsRemoteStore {
  load(): Promise<StudioSettings>;
  save(settings: StudioSettings): Promise<void>;
}

export function createStudioSettingsSyncDescriptor(stores: {
  fallback: StudioSettingsFallbackStore;
  remote: StudioSettingsRemoteStore;
}): SyncDocumentDescriptor<StudioSettings> {
  return {
    id: 'studio-settings',
    loadFallback: () => stores.fallback.load(),
    saveFallback: (settings) => stores.fallback.save(settings),
    loadRemote: () => stores.remote.load(),
    saveRemote: (settings) => stores.remote.save(settings),
    normalize: (settings) => normalizeStudioSettings(settings),
    messages: {
      loadRemoteFailed: 'Could not load studio settings from encrypted storage. Using local settings fallback.',
      saveRemoteFailed: 'Could not persist studio settings to encrypted storage. Local settings fallback was updated.'
    }
  };
}

export const studioSettingsSyncDescriptor = createStudioSettingsSyncDescriptor({
  fallback: localStudioSettingsStore,
  remote: remoteStudioSettingsStore
});
