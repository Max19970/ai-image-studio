import type { ProviderSettings } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
import { getEffectiveProviderSettings, mergeProviderSettingsIntoStudioSettings, normalizeStudioSettings } from '../../entities/studio-settings';
import { localStudioSettingsStore } from '../../infrastructure/storage/localStudioSettingsStore';
import { remoteStudioSettingsStore } from '../../infrastructure/storage/remoteStudioSettingsStore';

export function loadStudioSettings(): StudioSettings {
  return localStudioSettingsStore.load();
}

export async function loadStudioSettingsFromDatabase(): Promise<StudioSettings> {
  try {
    const settings = normalizeStudioSettings(await remoteStudioSettingsStore.load());
    localStudioSettingsStore.save(settings);
    return settings;
  } catch (error) {
    console.warn('Could not load studio settings from encrypted storage. Using local settings fallback.', error);
    return loadStudioSettings();
  }
}

export function saveStudioSettings(settings: StudioSettings) {
  const safeSettings = normalizeStudioSettings(settings);
  localStudioSettingsStore.save(safeSettings);
  void remoteStudioSettingsStore.save(safeSettings).catch((error) => {
    console.warn('Could not persist studio settings to encrypted storage. Local settings fallback was updated.', error);
  });
}

export function loadProviderSettings(): ProviderSettings {
  return getEffectiveProviderSettings(loadStudioSettings());
}

export function saveProviderSettings(settings: ProviderSettings) {
  saveStudioSettings(mergeProviderSettingsIntoStudioSettings(loadStudioSettings(), settings));
}
