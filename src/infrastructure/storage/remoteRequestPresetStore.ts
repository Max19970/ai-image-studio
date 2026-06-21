import { normalizeRequestPresets } from '../../entities/request-presets';
import type { RequestPreset } from '../../entities/request-presets';
import { loadRemoteAppDocument, saveRemoteAppDocument } from './remoteAppDocumentStore';

export const requestPresetsStorageEndpoint = '/api/storage/request-presets';

export const remoteRequestPresetStore = {
  async load(): Promise<RequestPreset[]> {
    return normalizeRequestPresets(await loadRemoteAppDocument<unknown>(requestPresetsStorageEndpoint, []));
  },

  async save(presets: RequestPreset[]): Promise<void> {
    await saveRemoteAppDocument(requestPresetsStorageEndpoint, 'presets', normalizeRequestPresets(presets));
  }
};
