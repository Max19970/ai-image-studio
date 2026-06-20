import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProviderRuntimeCapabilities } from '../src/entities/provider/types';
import {
  addImageFilesToProviderModeDraft,
  providerModeAllowsImageAttachments,
  sanitizeGenerationDraftForProviderCapabilities,
  sanitizeBatchDraftsForSettings
} from '../src/entities/provider/compatibility';
import { defaultImageParams, defaultStudioSettings } from '../src/domain/defaults';
import type { BatchComposerDraft } from '../src/domain/generationTask';
import { comfyUiHiresFixMode, comfyUiTextToImageMode } from '../src/entities/generation-params/comfyui/modes';
import { openAiCompatibleImageEditMode, openAiCompatibleImageEditModeId } from '../src/entities/generation-params/openai-compatible/modes';

const apiCapabilities: ProviderRuntimeCapabilities = {
  supportsGenerate: true,
  supportsEdit: true,
  supportsImageAttachments: true,
  supportsMask: true,
  supportsStreaming: true,
  usesLocalWorkflow: false,
  hasLiveResources: false
};

const localTextToImageCapabilities: ProviderRuntimeCapabilities = {
  supportsGenerate: true,
  supportsEdit: false,
  supportsImageAttachments: false,
  supportsMask: false,
  supportsStreaming: false,
  usesLocalWorkflow: true,
  hasLiveResources: true
};

function image(name: string) {
  return new File(['x'], name, { type: 'image/png' });
}

test('provider compatibility sanitizer keeps supported OpenAI-style edit draft intact', () => {
  const targetImage = image('target.png');
  const referenceImages = [image('ref.png')];
  const mask = image('mask.png');

  const draft = {
    mode: 'edit' as const,
    targetImage,
    referenceImages,
    mask
  };

  const result = sanitizeGenerationDraftForProviderCapabilities(draft, apiCapabilities);

  assert.equal(result.changed, false);
  assert.deepEqual(result.changes, []);
  assert.equal(result.value, draft);
});

test('provider compatibility sanitizer clears old edit attachments for local text-to-image providers', () => {
  const result = sanitizeGenerationDraftForProviderCapabilities({
    mode: 'edit' as const,
    targetImage: image('target.png'),
    referenceImages: [image('ref-a.png'), image('ref-b.png')],
    mask: image('mask.png')
  }, localTextToImageCapabilities);

  assert.equal(result.changed, true);
  assert.deepEqual(result.changes, ['mode', 'imageAttachments', 'mask']);
  assert.equal(result.value.mode, 'generate');
  assert.equal(result.value.targetImage, null);
  assert.deepEqual(result.value.referenceImages, []);
  assert.equal(result.value.mask, null);
});

test('provider compatibility sanitizer can clear masks independently from image attachments', () => {
  const result = sanitizeGenerationDraftForProviderCapabilities({
    mode: 'edit' as const,
    targetImage: image('target.png'),
    referenceImages: [image('ref.png')],
    mask: image('mask.png')
  }, {
    ...apiCapabilities,
    supportsMask: false
  });

  assert.equal(result.changed, true);
  assert.deepEqual(result.changes, ['mask']);
  assert.equal(result.value.mode, 'edit');
  assert.ok(result.value.targetImage);
  assert.equal(result.value.referenceImages.length, 1);
  assert.equal(result.value.mask, null);
});

test('provider mode image availability is based on the active mode, not provider-level alternatives', () => {
  assert.equal(providerModeAllowsImageAttachments(comfyUiTextToImageMode), false);
  assert.equal(providerModeAllowsImageAttachments(comfyUiHiresFixMode), true);
});

test('batch draft sanitizer preserves OpenAI-compatible drafts with default settings', () => {
  const draft: BatchComposerDraft = {
    id: 'draft-1',
    providerModeId: openAiCompatibleImageEditModeId,
    params: defaultImageParams,
    selectedModelId: defaultStudioSettings.selectedModelId,
    targetImage: image('target.png'),
    referenceImages: [image('ref.png')],
    mask: image('mask.png')
  };

  const sanitized = sanitizeBatchDraftsForSettings([draft], defaultStudioSettings);

  assert.equal(sanitized[0].providerModeId, openAiCompatibleImageEditModeId);
  assert.ok(sanitized[0].targetImage);
  assert.equal(sanitized[0].referenceImages.length, 1);
  assert.ok(sanitized[0].mask);
});
