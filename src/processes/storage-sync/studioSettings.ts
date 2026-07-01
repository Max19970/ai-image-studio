import type { ProviderSettings } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
import { getEffectiveProviderSettings, mergeProviderSettingsIntoStudioSettings, normalizeStudioSettings } from '../../entities/studio-settings';
import { localStudioSettingsStore } from '../../infrastructure/storage/localStudioSettingsStore';
import { remoteStudioSettingsStore } from '../../infrastructure/storage/remoteStudioSettingsStore';
import { createSyncDocumentRuntime, voidContext, type SyncDocumentDescriptor } from './documentSyncEngine';

export const studioSettingsSyncDescriptor = {
  id: 'studio-settings',
  loadFallback: () => localStudioSettingsStore.load(),
  saveFallback: (settings) => localStudioSettingsStore.save(settings),
  loadRemote: () => remoteStudioSettingsStore.load(),
  saveRemote: (settings) => remoteStudioSettingsStore.save(settings),
  normalize: (settings) => normalizeStudioSettings(settings),
  messages: {
    loadRemoteFailed: 'Could not load studio settings from encrypted storage. Using local settings fallback.',
    saveRemoteFailed: 'Could not persist studio settings to encrypted storage. Local settings fallback was updated.'
  }
} satisfies SyncDocumentDescriptor<StudioSettings>;

const studioSettingsSync = createSyncDocumentRuntime(studioSettingsSyncDescriptor);

export function loadStudioSettings(): StudioSettings {
  return studioSettingsSync.loadFallback(voidContext());
}

export function loadStudioSettingsFromDatabase(): Promise<StudioSettings> {
  return studioSettingsSync.loadFromRemote(voidContext());
}

export function saveStudioSettings(settings: StudioSettings) {
  studioSettingsSync.save(settings, voidContext());
}

export function loadProviderSettings(): ProviderSettings {
  return getEffectiveProviderSettings(loadStudioSettings());
}

export function saveProviderSettings(settings: ProviderSettings) {
  saveStudioSettings(mergeProviderSettingsIntoStudioSettings(loadStudioSettings(), settings));
}
