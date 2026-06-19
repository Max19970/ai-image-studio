import test from 'node:test';
import assert from 'node:assert/strict';
import type { BatchComposerDraft } from '../src/domain/generationTask';
import { defaultImageParams, defaultStudioSettings } from '../src/domain/defaults';
import type { StudioSettings } from '../src/domain/studioSettings';
import { writeProviderParamState } from '../src/entities/generation-params/providerState';
import { providerContextForModel } from '../src/domain/generationSnapshots';
import { prepareBatchItems } from '../src/processes/batch-runner/requestBuilder';

function t(key: string, values?: Record<string, unknown>) {
  if (!values) return key;
  return Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), key);
}

function mixedSettings(): StudioSettings {
  return {
    ...defaultStudioSettings,
    models: defaultStudioSettings.models.map((model) => model.id === 'comfyui-checkpoint-default'
      ? { ...model, modelId: 'realistic.safetensors' }
      : model)
  };
}

test('batch request builder keeps provider/model params isolated per draft', () => {
  const settings = mixedSettings();
  const comfyProvider = providerContextForModel(settings, 'comfyui-checkpoint-default').provider;
  const openAiDraft: BatchComposerDraft = {
    id: 'draft-openai',
    mode: 'generate',
    selectedModelId: 'gpt-image-2-default',
    params: { ...defaultImageParams, prompt: 'openai request', retryAttempts: 1, retryDelaySeconds: 3 },
    targetImage: null,
    referenceImages: [],
    mask: null
  };
  const comfyDraft: BatchComposerDraft = {
    id: 'draft-comfy',
    mode: 'generate',
    selectedModelId: 'comfyui-checkpoint-default',
    params: writeProviderParamState(
      { ...defaultImageParams, prompt: 'comfy request', retryAttempts: 2, retryDelaySeconds: 7 },
      comfyProvider,
      { steps: 16, cfg: 5.5, width: 768, height: 512, batchSize: 1, samplerName: 'euler', scheduler: 'normal', denoise: 1, filenamePrefix: 'batch', seedMode: 'fixed', seed: 12, negativePrompt: '', loras: [] }
    ),
    targetImage: null,
    referenceImages: [],
    mask: null
  };

  const prepared = prepareBatchItems({
    drafts: [openAiDraft, comfyDraft],
    intervalSeconds: 2,
    settings,
    selectedModelId: settings.selectedModelId,
    capabilityReport: null,
    taskHistory: {} as never,
    t
  });

  assert.equal(prepared.length, 2);
  assert.equal(prepared[0].provider.adapterId, 'openai-compatible');
  assert.equal(prepared[0].payload.model, 'gpt-image-2');
  assert.equal(prepared[0].snapshot.params.retryAttempts, 1);
  assert.equal(prepared[1].provider.adapterId, 'comfyui');
  assert.equal(prepared[1].payload.checkpoint, 'realistic.safetensors');
  assert.equal(prepared[1].payload.steps, 16);
  assert.equal(prepared[1].snapshot.params.retryAttempts, 2);
  assert.equal(prepared[1].snapshot.providerAdapterId, 'comfyui');
});
