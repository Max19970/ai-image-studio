import { defaultProviderSettings, defaultStudioSettings } from '../../domain/defaults';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { StudioSettings } from '../../domain/studioSettings';
import { createStudioSettingsFromLegacyProvider, normalizeStudioSettings, sanitizeStudioSettingsForPersistence } from '../../entities/studio-settings';
import { readLocalJson, writeLocalJson } from './localJson';

export const legacyProviderStorageKey = 'gpt-image-2-studio.provider.v2';
export const studioSettingsStorageKey = 'image-studio.settings.v1';

export const localStudioSettingsStore = {
  load(): StudioSettings {
    const raw = localStorage.getItem(studioSettingsStorageKey);
    if (!raw) return this.loadLegacyProvider();

    try {
      return normalizeStudioSettings(JSON.parse(raw) as Partial<StudioSettings>);
    } catch {
      return defaultStudioSettings;
    }
  },

  save(settings: StudioSettings) {
    writeLocalJson(studioSettingsStorageKey, sanitizeStudioSettingsForPersistence(settings));
  },

  loadLegacyProvider(): StudioSettings {
    const loaded = readLocalJson<ProviderSettings>(legacyProviderStorageKey, defaultProviderSettings);
    return createStudioSettingsFromLegacyProvider(loaded);
  }
};
