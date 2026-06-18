import { defaultStudioSettings } from '../../domain/defaults';
import type { StudioSettings } from '../../domain/studioSettings';
import { normalizeStudioSettings, sanitizeStudioSettingsForPersistence } from '../../entities/studio-settings';
import { loadRemoteAppDocument, saveRemoteAppDocument } from './remoteAppDocumentStore';

export const studioSettingsStorageEndpoint = '/api/storage/studio-settings';

export const remoteStudioSettingsStore = {
  async load(): Promise<StudioSettings> {
    return normalizeStudioSettings(await loadRemoteAppDocument<Partial<StudioSettings> | null>(studioSettingsStorageEndpoint, defaultStudioSettings));
  },

  async save(settings: StudioSettings): Promise<void> {
    await saveRemoteAppDocument(studioSettingsStorageEndpoint, 'settings', sanitizeStudioSettingsForPersistence(settings));
  }
};
