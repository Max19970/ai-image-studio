import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheKeyForComfyUiResources,
  normalizeComfyUiSettingsData,
  readComfyUiSettingsData,
  updateComfyUiResourceCache,
  writeComfyUiSettingsData
} from '../src/domain/comfyUiSettings';
import type { StudioSettings } from '../src/domain/studioSettings';
import { normalizeStudioSettings } from '../src/entities/studio-settings';

const baseSettings: StudioSettings = {
  providers: [{ id: 'p1', name: 'Comfy', adapterId: 'comfyui', generationEndpoint: 'http://127.0.0.1:8188', editEndpoint: '', responsesEndpoint: '', apiKey: '', authHeaderName: '', authScheme: '', customHeadersJson: '', timeoutMs: 300000, persistApiKey: false }],
  models: [{ id: 'm1', name: 'Checkpoint', providerId: 'p1', modelId: 'dream.safetensors', notes: '' }],
  selectedModelId: 'm1',
  interfaceTheme: 'glass'
};

test('ComfyUI settings data normalizes LoRA registry and resource cache', () => {
  const data = normalizeComfyUiSettingsData({
    loras: [{ id: 'l1', displayName: 'Style', lora_name: 'style.safetensors', strength_model: 0.8 }],
    resourceCache: {
      'p1:loras': {
        providerId: 'p1',
        kind: 'loras',
        providerLabel: 'ComfyUI',
        createdAt: 10,
        items: [{ id: 'style.safetensors', name: 'style.safetensors', nativeName: 'style.safetensors' }]
      }
    }
  });

  assert.equal(data.loras[0]?.displayName, 'Style');
  assert.equal(data.loras[0]?.loraName, 'style.safetensors');
  assert.equal(data.loras[0]?.defaultStrengthModel, 0.8);
  assert.equal(data.loras[0]?.defaultStrengthClip, 0.8);
  assert.equal(data.resourceCache['p1:loras']?.items[0]?.name, 'style.safetensors');
});

test('ComfyUI adapter data is read and written through StudioSettings extension bucket', () => {
  const withData = writeComfyUiSettingsData(baseSettings, {
    loras: [{ id: 'l1', displayName: 'Detail LoRA', loraName: 'detail.safetensors', notes: '', defaultStrengthModel: 1, defaultStrengthClip: 1 }],
    resourceCache: {}
  });

  assert.equal(readComfyUiSettingsData(withData).loras[0]?.loraName, 'detail.safetensors');
  assert.equal(baseSettings.adapterData, undefined);
});

test('ComfyUI resource cache is keyed by provider and kind', () => {
  const next = updateComfyUiResourceCache(baseSettings, 'p1', {
    kind: 'checkpoints',
    providerLabel: 'ComfyUI',
    createdAt: 20,
    items: [{ id: 'dream.safetensors', name: 'dream.safetensors' }]
  });

  const cache = readComfyUiSettingsData(next).resourceCache[cacheKeyForComfyUiResources('p1', 'checkpoints')];
  assert.equal(cache?.providerId, 'p1');
  assert.equal(cache?.items[0]?.name, 'dream.safetensors');
});


test('ComfyUI checkpoint model may stay empty until live resources are selected', () => {
  const normalized = normalizeStudioSettings({
    ...baseSettings,
    models: [{ ...baseSettings.models[0], modelId: '' }]
  });

  assert.equal(normalized.models[0]?.modelId, '');
});
