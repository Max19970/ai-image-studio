import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams, defaultStudioSettings } from '../src/domain/defaults';
import {
  openAiCompatibleImageEditModeId,
  openAiCompatibleImageGenerateModeId
} from '../src/entities/generation-params/openai-compatible/modes';
import type { ComposerRequestDraft } from '../src/domain/generationTask';
import {
  evaluateComposerDraftReadiness,
  summarizeComposerQueue
} from '../src/features/composer/model/composerDraftReadiness';

function draft(overrides: Partial<ComposerRequestDraft> = {}): ComposerRequestDraft {
  return {
    id: crypto.randomUUID(),
    providerModeId: openAiCompatibleImageGenerateModeId,
    params: { ...defaultImageParams, prompt: 'cinematic portrait' },
    selectedModelId: defaultStudioSettings.selectedModelId,
    targetImage: null,
    referenceImages: [],
    mask: null,
    ...overrides
  };
}

test('composer readiness identifies missing prompt and required attachment', () => {
  const missingPrompt = evaluateComposerDraftReadiness(
    draft({ params: { ...defaultImageParams, prompt: '' } }),
    defaultStudioSettings
  );
  const missingAttachment = evaluateComposerDraftReadiness(
    draft({ providerModeId: openAiCompatibleImageEditModeId }),
    defaultStudioSettings
  );

  assert.equal(missingPrompt.issue, 'missing-prompt');
  assert.equal(missingPrompt.ready, false);
  assert.equal(missingAttachment.issue, 'missing-attachments');
  assert.equal(missingAttachment.ready, false);
});

test('composer readiness accepts valid generation and edit requests', () => {
  const image = new File(['image'], 'target.png', { type: 'image/png' });
  const generation = evaluateComposerDraftReadiness(draft(), defaultStudioSettings);
  const edit = evaluateComposerDraftReadiness(
    draft({ providerModeId: openAiCompatibleImageEditModeId, targetImage: image }),
    defaultStudioSettings
  );

  assert.equal(generation.ready, true);
  assert.equal(edit.ready, true);
  assert.equal(edit.attachmentCount, 1);
});

test('queue summary reports ready and invalid requests independently', () => {
  const readiness = [
    evaluateComposerDraftReadiness(draft({ params: { ...defaultImageParams, prompt: 'one', n: 2 } }), defaultStudioSettings),
    evaluateComposerDraftReadiness(draft({ params: { ...defaultImageParams, prompt: '' } }), defaultStudioSettings)
  ];

  assert.deepEqual(summarizeComposerQueue(readiness), {
    totalCount: 2,
    readyCount: 1,
    invalidCount: 1,
    totalExpectedImages: 3
  });
});
