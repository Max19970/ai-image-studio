import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams, defaultStudioSettings } from '../src/domain/defaults';
import type { ComposerRequestDraft } from '../src/domain/generationTask';
import {
  openAiCompatibleImageEditModeId,
  openAiCompatibleImageGenerateModeId
} from '../src/entities/generation-params/openai-compatible/modes';
import {
  analyzeComposerDraft,
  explainComposerDraftAnalysisWarnings
} from '../src/processes/generation-request/analyzeComposerDraft';
import { prepareBatchItems } from '../src/processes/batch-runner/requestBuilder';

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

const t = (key: string) => key;

function preparedCount(item: ComposerRequestDraft, settings = defaultStudioSettings) {
  return prepareBatchItems({
    drafts: [item],
    intervalSeconds: 0,
    settings,
    selectedModelId: defaultStudioSettings.selectedModelId,
    capabilityReport: null,
    t
  }).length;
}

test('UI analysis and batch inclusion agree across readiness cases', () => {
  const target = new File(['image'], 'target.png', { type: 'image/png' });
  const cases: Array<{ name: string; item: ComposerRequestDraft; settings?: typeof defaultStudioSettings; issue: string | null }> = [
    { name: 'missing model', item: draft(), settings: { ...defaultStudioSettings, models: [] }, issue: 'missing-model' },
    { name: 'blank prompt', item: draft({ params: { ...defaultImageParams, prompt: '   ' } }), issue: 'missing-prompt' },
    { name: 'edit without attachment', item: draft({ providerModeId: openAiCompatibleImageEditModeId }), issue: 'missing-attachments' },
    { name: 'invalid raw params', item: draft({ params: { ...defaultImageParams, prompt: 'fox', rawJson: '{' } }), issue: 'invalid-parameters' },
    { name: 'valid generate', item: draft(), issue: null },
    { name: 'valid edit', item: draft({ providerModeId: openAiCompatibleImageEditModeId, targetImage: target }), issue: null }
  ];

  for (const itemCase of cases) {
    const settings = itemCase.settings ?? defaultStudioSettings;
    const analysis = analyzeComposerDraft(itemCase.item, settings);
    assert.equal(analysis.issue, itemCase.issue, itemCase.name);
    assert.equal(preparedCount(itemCase.item, settings), analysis.ready ? 1 : 0, itemCase.name);
  }
});

test('analysis exposes the exact resolved payload and expected image count', () => {
  const item = draft({ params: { ...defaultImageParams, prompt: 'fox', n: 3 } });
  const analysis = analyzeComposerDraft(item, defaultStudioSettings);

  assert.equal(analysis.ready, true);
  assert.equal(analysis.expectedImageCount, 3);
  assert.equal(analysis.payload?.prompt, 'fox');
  assert.equal(analysis.payload?.n, 3);
});

test('unknown mode id resolves through the model-specific fallback once', () => {
  const analysis = analyzeComposerDraft(draft({ providerModeId: 'unknown.mode' }), defaultStudioSettings);
  assert.equal(analysis.ready, true);
  assert.equal(analysis.providerMode.id, openAiCompatibleImageGenerateModeId);
});

test('warning presentation consumes analysis context and reports custom size issues', () => {
  const analysis = analyzeComposerDraft(draft({
    params: { ...defaultImageParams, prompt: 'fox', sizeMode: 'custom', width: 1025, height: 1024 }
  }), defaultStudioSettings);
  const warnings = explainComposerDraftAnalysisWarnings({ analysis, capabilityReport: null, t });
  assert.ok(warnings.length > 0);
});
