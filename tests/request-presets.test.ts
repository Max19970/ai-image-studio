import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams } from '../src/domain/defaults';
import type { ComposerRequestDraft } from '../src/domain/generationTask';
import {
  applyRequestPresetToDraft,
  createRequestPreset,
  normalizeRequestPresets,
  updateRequestPreset
} from '../src/entities/request-presets';

test('request presets capture and normalize prompt, mode, model and provider params', () => {
  const preset = createRequestPreset({
    now: 100,
    snapshot: {
      providerModeId: 'comfyui.text-to-image',
      selectedModelId: 'model-local',
      params: {
        ...defaultImageParams,
        prompt: ' painterly fox ',
        n: 2,
        providerParams: { comfyui: { steps: 28, cfg: 6.5 } }
      }
    },
    meta: { providerLabel: 'Local ComfyUI', modelLabel: 'Dream local checkpoint', providerModeLabel: 'Text to Image' }
  });

  assert.equal(preset.name, 'painterly fox');
  assert.equal(preset.createdAt, 100);
  assert.equal(preset.snapshot.providerModeId, 'comfyui.text-to-image');
  assert.equal(preset.snapshot.selectedModelId, 'model-local');
  assert.deepEqual(preset.snapshot.params.providerParams, { comfyui: { steps: 28, cfg: 6.5 } });

  const restored = normalizeRequestPresets([{
    ...preset,
    snapshot: {
      ...preset.snapshot,
      params: { ...preset.snapshot.params, n: 99 }
    }
  }]);

  assert.equal(restored.length, 1);
  assert.equal(restored[0].snapshot.params.n, 10);
});

test('request preset edits can replace metadata without losing snapshot unless asked', () => {
  const preset = createRequestPreset({
    now: 100,
    snapshot: { providerModeId: 'openai-compatible.image-generate', selectedModelId: 'model-a', params: defaultImageParams }
  });

  const renamed = updateRequestPreset(preset, { now: 200, name: 'Portrait base', note: 'soft light' });
  assert.equal(renamed.name, 'Portrait base');
  assert.equal(renamed.note, 'soft light');
  assert.equal(renamed.updatedAt, 200);
  assert.equal(renamed.snapshot.selectedModelId, 'model-a');

  const replaced = updateRequestPreset(renamed, {
    now: 300,
    snapshot: {
      providerModeId: 'comfyui.hires-fix',
      selectedModelId: 'model-b',
      params: { ...defaultImageParams, prompt: 'hires pass' }
    }
  });
  assert.equal(replaced.snapshot.providerModeId, 'comfyui.hires-fix');
  assert.equal(replaced.snapshot.selectedModelId, 'model-b');
  assert.equal(replaced.snapshot.params.prompt, 'hires pass');
});

test('applying a request preset to a composer draft restores only that draft and clears runtime attachments', () => {
  const preset = createRequestPreset({
    snapshot: {
      providerModeId: 'openai-compatible.image-generate',
      selectedModelId: 'model-b',
      params: { ...defaultImageParams, prompt: 'saved prompt', n: 3 }
    }
  });

  const draft: ComposerRequestDraft = {
    id: 'draft-1',
    providerModeId: 'comfyui.hires-fix',
    selectedModelId: 'model-a',
    params: { ...defaultImageParams, prompt: 'old prompt' },
    targetImage: {} as File,
    referenceImages: [{} as File, {} as File],
    mask: {} as File
  };

  const next = applyRequestPresetToDraft(draft, preset);
  assert.equal(next.id, 'draft-1');
  assert.equal(next.providerModeId, 'openai-compatible.image-generate');
  assert.equal(next.selectedModelId, 'model-b');
  assert.equal(next.params.prompt, 'saved prompt');
  assert.equal(next.params.n, 3);
  assert.equal(next.targetImage, null);
  assert.deepEqual(next.referenceImages, []);
  assert.equal(next.mask, null);
});
