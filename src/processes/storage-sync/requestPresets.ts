import { normalizeRequestPresets } from '../../entities/request-presets';
import type { RequestPreset } from '../../entities/request-presets';
import { localRequestPresetStore } from '../../infrastructure/storage/localRequestPresetStore';
import { remoteRequestPresetStore } from '../../infrastructure/storage/remoteRequestPresetStore';

export function loadRequestPresets(): RequestPreset[] {
  return localRequestPresetStore.load();
}

export async function loadRequestPresetsFromDatabase(): Promise<RequestPreset[]> {
  try {
    const presets = normalizeRequestPresets(await remoteRequestPresetStore.load());
    localRequestPresetStore.save(presets);
    return presets;
  } catch (error) {
    console.warn('Could not load request presets from encrypted storage. Using local presets fallback.', error);
    return loadRequestPresets();
  }
}

export function saveRequestPresets(presets: RequestPreset[]) {
  const safePresets = normalizeRequestPresets(presets);
  localRequestPresetStore.save(safePresets);
  void remoteRequestPresetStore.save(safePresets).catch((error) => {
    console.warn('Could not persist request presets to encrypted storage. Local presets fallback was updated.', error);
  });
}
