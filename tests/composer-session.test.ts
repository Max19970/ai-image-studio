import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams, defaultStudioSettings } from '../src/domain/defaults';
import {
  clearComposerDraftContent,
  createComposerRequestDraft,
  removeComposerDraft,
  selectComposerDraftAfterRemoval
} from '../src/app/workspace/state/composerSession';

const seed = {
  params: defaultImageParams,
  selectedModelId: defaultStudioSettings.selectedModelId,
  providerModeId: 'openai-compatible.image-generate'
};

test('new queue request inherits configuration but clears prompt and attachments', () => {
  const file = new File(['image'], 'reference.png', { type: 'image/png' });
  const source = createComposerRequestDraft(seed, {
    params: { ...defaultImageParams, prompt: 'cinematic portrait', n: 3 },
    targetImage: file,
    referenceImages: [file],
    mask: file
  });

  const next = createComposerRequestDraft(seed, source, { clearContent: true });

  assert.notEqual(next.id, source.id);
  assert.equal(next.selectedModelId, source.selectedModelId);
  assert.equal(next.providerModeId, source.providerModeId);
  assert.equal(next.params.n, 3);
  assert.equal(next.params.prompt, '');
  assert.equal(next.targetImage, null);
  assert.deepEqual(next.referenceImages, []);
  assert.equal(next.mask, null);
});

test('removing the active request selects the next neighbour and keeps at least one draft', () => {
  const first = createComposerRequestDraft(seed, { params: { ...defaultImageParams, prompt: 'one' } });
  const second = createComposerRequestDraft(seed, { params: { ...defaultImageParams, prompt: 'two' } });
  const third = createComposerRequestDraft(seed, { params: { ...defaultImageParams, prompt: 'three' } });
  const drafts = [first, second, third];

  assert.equal(selectComposerDraftAfterRemoval(drafts, second.id)?.id, third.id);
  assert.deepEqual(removeComposerDraft(drafts, second.id).map((draft) => draft.id), [first.id, third.id]);
  assert.deepEqual(removeComposerDraft([first], first.id), [first]);
});

test('clearing the last request preserves its configuration and identity', () => {
  const file = new File(['image'], 'reference.png', { type: 'image/png' });
  const draft = createComposerRequestDraft(seed, {
    params: { ...defaultImageParams, prompt: 'keep config', n: 2 },
    referenceImages: [file]
  });

  const cleared = clearComposerDraftContent(draft);

  assert.equal(cleared.id, draft.id);
  assert.equal(cleared.params.n, 2);
  assert.equal(cleared.params.prompt, '');
  assert.deepEqual(cleared.referenceImages, []);
});
