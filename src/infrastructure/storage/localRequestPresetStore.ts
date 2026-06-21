import { normalizeRequestPresets } from '../../entities/request-presets';
import type { RequestPreset } from '../../entities/request-presets';
import { readLocalJson, writeLocalJson } from './localJson';

export const requestPresetsStorageKey = 'image-studio.request-presets.v1';

export const localRequestPresetStore = {
  load(): RequestPreset[] {
    return normalizeRequestPresets(readLocalJson<unknown>(requestPresetsStorageKey, []));
  },

  save(presets: RequestPreset[]) {
    writeLocalJson(requestPresetsStorageKey, normalizeRequestPresets(presets));
  }
};
