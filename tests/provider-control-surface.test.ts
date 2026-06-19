import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudioSettings } from '../src/domain/studioSettings';
import { defaultImageParams } from '../src/domain/defaults';
import { writeComfyUiSettingsData } from '../src/domain/comfyUiSettings';
import { resolveProviderControlSurface } from '../src/entities/provider/controlSurface';
import { getComfyUiRegisteredLoraOptions, toggleComfyUiRegisteredLoraById } from '../src/entities/generation-params/comfyui/loraSelection';
import { toProviderSettings } from '../src/entities/studio-settings';

const comfySettings: StudioSettings = {
  providers: [{
    id: 'p-comfy',
    name: 'Local ComfyUI',
    adapterId: 'comfyui',
    generationEndpoint: 'http://127.0.0.1:8188',
    editEndpoint: '',
    responsesEndpoint: '',
    apiKey: '',
    authHeaderName: '',
    authScheme: '',
    customHeadersJson: '',
    timeoutMs: 300000,
    persistApiKey: false
  }],
  models: [{ id: 'm-comfy', name: 'Dream', providerId: 'p-comfy', modelId: 'dream.safetensors', notes: '' }],
  selectedModelId: 'm-comfy',
  interfaceTheme: 'glass'
};

const apiSettings: StudioSettings = {
  providers: [{
    id: 'p-api',
    name: 'API',
    adapterId: 'openai-compatible',
    generationEndpoint: 'https://provider.test/v1/images/generations',
    editEndpoint: 'https://provider.test/v1/images/edits',
    responsesEndpoint: '',
    apiKey: '',
    authHeaderName: 'Authorization',
    authScheme: 'Bearer',
    customHeadersJson: '',
    timeoutMs: 120000,
    persistApiKey: false
  }],
  models: [{ id: 'm-api', name: 'API Image', providerId: 'p-api', modelId: 'image-model', notes: '' }],
  selectedModelId: 'm-api',
  interfaceTheme: 'glass'
};

test('provider control surface hides unsupported OpenAI edit controls for ComfyUI', () => {
  const context = resolveProviderControlSurface({ settings: comfySettings, modelId: 'm-comfy' });

  assert.equal(context.surface.kind, 'local-workflow');
  assert.equal(context.surface.showModeSwitcher, false);
  assert.equal(context.surface.showImageAttachments, false);
  assert.equal(context.surface.showMask, false);
  assert.equal(context.surface.showLoraRegistry, true);
  assert.equal(context.surface.showParameters, true);
  assert.equal(context.surface.showBatch, true);
});

test('provider control surface keeps OpenAI-compatible edit controls visible', () => {
  const context = resolveProviderControlSurface({ settings: apiSettings, modelId: 'm-api' });

  assert.equal(context.surface.kind, 'api-image');
  assert.equal(context.surface.showModeSwitcher, true);
  assert.equal(context.surface.showImageAttachments, true);
  assert.equal(context.surface.showMask, true);
  assert.equal(context.surface.showLoraRegistry, false);
});

test('ComfyUI registered LoRA quick toggle writes provider-owned lora state', () => {
  const settings = writeComfyUiSettingsData(comfySettings, {
    loras: [{ id: 'lora-style', displayName: 'Style', loraName: 'style.safetensors', notes: '', defaultStrengthModel: 0.75, defaultStrengthClip: 0.65 }],
    resourceCache: {}
  });
  const provider = toProviderSettings(settings.providers[0], settings.models[0]);

  const enabled = toggleComfyUiRegisteredLoraById(settings, defaultImageParams, provider, 'lora-style');
  const options = getComfyUiRegisteredLoraOptions(settings, enabled, provider);

  assert.equal(options[0]?.selected, true);
  assert.deepEqual(enabled.providerParams?.comfyui?.loras, [{
    name: 'style.safetensors',
    strengthModel: 0.75,
    strengthClip: 0.65,
    enabled: true
  }]);

  const disabled = toggleComfyUiRegisteredLoraById(settings, enabled, provider, 'lora-style');
  assert.equal(getComfyUiRegisteredLoraOptions(settings, disabled, provider)[0]?.selected, false);
});
