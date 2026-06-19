import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams, defaultProviderSettings } from '../src/domain/defaults';
import { normalizeImageParams } from '../src/entities/image-params';
import {
  buildOpenAiCompatibleRequestSurfacePayload,
  getProviderGenerationRequestSurface,
  getProviderGenerationRequestSurfaceById
} from '../src/entities/generation-params/requestSurface';
import { readProviderParamState, writeProviderParamState } from '../src/entities/generation-params/providerState';
import type { GenerationRequestSnapshot } from '../src/domain/generationTask';

const provider = { ...defaultProviderSettings, adapterId: 'openai-compatible', modelId: 'surface-model' };

test('provider parameter bucket is normalized and isolated by adapter key', () => {
  const params = writeProviderParamState(defaultImageParams, provider, { seed: 123, cfg: 7 });
  const normalized = normalizeImageParams({
    ...params,
    providerParams: {
      ...params.providerParams,
      broken: 'nope' as never
    }
  });

  assert.deepEqual(readProviderParamState(normalized, provider), { seed: 123, cfg: 7 });
  assert.equal('broken' in (normalized.providerParams ?? {}), false);
});

test('OpenAI-compatible request surface preserves existing payload and snapshot behavior', () => {
  const surface = getProviderGenerationRequestSurface(provider);
  assert.equal(surface.id, 'openai-compatible.logical-params');

  const params = {
    ...defaultImageParams,
    prompt: '  fox  ',
    includeModel: true,
    includeN: true,
    n: 2,
    rawJson: '{"custom_flag":true}'
  };

  const payload = buildOpenAiCompatibleRequestSurfacePayload(params, provider, 'generate');
  assert.equal(payload.prompt, 'fox');
  assert.equal(payload.model, 'surface-model');
  assert.equal(payload.n, 2);
  assert.equal(payload.custom_flag, true);

  const snapshotParams = surface.captureParamsSnapshot({ params, provider, mode: 'generate', payload });
  assert.equal(snapshotParams.n, 2);
  assert.equal(snapshotParams.rawJson, '{"custom_flag":true}');
  assert.equal(surface.captureProviderParamsSnapshot({ params, provider, mode: 'generate', payload }), undefined);
});

test('request restore is selected by surface id and keeps provider params bucket available', () => {
  const snapshot: GenerationRequestSnapshot = {
    createdAt: 1,
    mode: 'generate',
    prompt: 'restored',
    endpoint: '/api/generate',
    providerLabel: 'Provider',
    model: 'surface-model',
    modelLabel: 'Surface Model',
    payload: { model: 'surface-model', n: 3 },
    warnings: [],
    surfaceId: 'openai-compatible.logical-params',
    providerParams: { passthrough: true },
    attachments: [],
    params: {
      n: 3,
      sizeMode: defaultImageParams.sizeMode,
      sizePreset: defaultImageParams.sizePreset,
      width: defaultImageParams.width,
      height: defaultImageParams.height,
      quality: defaultImageParams.quality,
      background: defaultImageParams.background,
      moderation: defaultImageParams.moderation,
      outputFormat: defaultImageParams.outputFormat,
      outputCompression: defaultImageParams.outputCompression,
      stream: defaultImageParams.stream,
      partialImages: defaultImageParams.partialImages,
      responseFormat: defaultImageParams.responseFormat,
      inputFidelity: defaultImageParams.inputFidelity,
      user: defaultImageParams.user,
      style: defaultImageParams.style,
      rawJson: defaultImageParams.rawJson,
      retryAttempts: defaultImageParams.retryAttempts,
      retryDelaySeconds: defaultImageParams.retryDelaySeconds
    }
  };

  const restored = getProviderGenerationRequestSurfaceById(snapshot.surfaceId).restoreParamsFromSnapshot({
    previous: defaultImageParams,
    snapshot
  });

  assert.equal(restored.prompt, 'restored');
  assert.equal(restored.n, 3);
  assert.deepEqual(restored.providerParams?.['openai-compatible.logical-params'], { passthrough: true });
});

test('ComfyUI request surface builds provider-owned payload and parameter summary', () => {
  const comfyProvider = { ...defaultProviderSettings, adapterId: 'comfyui', modelId: 'realistic.safetensors' };
  const params = writeProviderParamState({ ...defaultImageParams, prompt: 'local fox' }, comfyProvider, {
    width: 832,
    height: 1216,
    batchSize: 2,
    steps: 32,
    cfg: 6.5,
    samplerName: 'dpmpp_2m',
    scheduler: 'karras',
    seedMode: 'fixed',
    seed: 42,
    denoise: 0.95,
    negativePrompt: 'blurry',
    loras: [{ name: 'style.safetensors', strengthModel: 0.8, strengthClip: 0.7, enabled: true }]
  });

  const surface = getProviderGenerationRequestSurface(comfyProvider);
  assert.equal(surface.id, 'comfyui.text-to-image');
  assert.equal(surface.kind, 'provider-owned');

  const payload = surface.buildPayload({ params, provider: comfyProvider, mode: 'generate' });
  assert.equal(payload.prompt, 'local fox');
  assert.equal(payload.checkpoint, 'realistic.safetensors');
  assert.equal(payload.width, 832);
  assert.equal(payload.height, 1216);
  assert.equal(payload.batch_size, 2);
  assert.equal(payload.seed, 42);
  assert.deepEqual(payload.loras, [{ lora_name: 'style.safetensors', strength_model: 0.8, strength_clip: 0.7 }]);

  const snapshotState = surface.captureProviderParamsSnapshot({ params, provider: comfyProvider, mode: 'generate', payload });
  assert.equal(snapshotState?.steps, 32);
  assert.equal(snapshotState?.samplerName, 'dpmpp_2m');

  const summary = surface.captureParameterSummary({ params, provider: comfyProvider, mode: 'generate', payload });
  assert.equal(summary?.surfaceId, 'comfyui.text-to-image');
  assert.ok(summary?.entries.some((entry) => entry.id === 'checkpoint' && entry.value === 'realistic.safetensors'));
});
