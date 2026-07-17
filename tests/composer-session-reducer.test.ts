import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultImageParams, defaultStudioSettings } from '../src/domain/defaults';
import {
  composerSessionReducer,
  createComposerSessionState,
  type ComposerDraftSeed
} from '../src/app/workspace/state/composerSession';

const seed: ComposerDraftSeed = {
  params: { ...defaultImageParams, prompt: 'initial' },
  selectedModelId: defaultStudioSettings.selectedModelId,
  providerModeId: 'openai-compatible.image-generate'
};

function state() {
  return createComposerSessionState(seed, { id: 'draft-1', intervalSeconds: 4 });
}

test('add, select, duplicate and remove preserve active draft invariants', () => {
  let current = state();
  current = composerSessionReducer(current, { type: 'addDraft', id: 'draft-2' });
  assert.deepEqual(current.drafts.map((draft) => draft.id), ['draft-1', 'draft-2']);
  assert.equal(current.activeDraftId, 'draft-2');
  assert.equal(current.drafts[1].params.prompt, '');

  current = composerSessionReducer(current, { type: 'selectDraft', id: 'draft-1' });
  assert.equal(current.activeDraftId, 'draft-1');

  current = composerSessionReducer(current, { type: 'duplicateDraft', id: 'draft-1', newId: 'draft-3' });
  assert.deepEqual(current.drafts.map((draft) => draft.id), ['draft-1', 'draft-2', 'draft-3']);
  assert.equal(current.activeDraftId, 'draft-3');
  assert.equal(current.drafts[2].params.prompt, 'initial');

  current = composerSessionReducer(current, { type: 'removeDraft', id: 'draft-3' });
  assert.deepEqual(current.drafts.map((draft) => draft.id), ['draft-1', 'draft-2']);
  assert.equal(current.activeDraftId, 'draft-2');

  current = composerSessionReducer(current, { type: 'removeDraft', id: 'draft-1' });
  assert.deepEqual(current.drafts.map((draft) => draft.id), ['draft-2']);
  assert.equal(current.activeDraftId, 'draft-2');
});

test('removing the only draft clears content but preserves its identity and configuration', () => {
  const file = new File(['image'], 'reference.png', { type: 'image/png' });
  let current = state();
  current = composerSessionReducer(current, {
    type: 'patchDraft',
    id: 'draft-1',
    patch: {
      params: { ...current.drafts[0].params, prompt: 'keep config', n: 3 },
      targetImage: file,
      referenceImages: [file],
      mask: file
    }
  });
  current = composerSessionReducer(current, { type: 'removeDraft', id: 'draft-1' });

  assert.equal(current.drafts.length, 1);
  assert.equal(current.drafts[0].id, 'draft-1');
  assert.equal(current.activeDraftId, 'draft-1');
  assert.equal(current.drafts[0].params.prompt, '');
  assert.equal(current.drafts[0].params.n, 3);
  assert.equal(current.drafts[0].targetImage, null);
  assert.deepEqual(current.drafts[0].referenceImages, []);
  assert.equal(current.drafts[0].mask, null);
});

test('replaceDrafts with empty input keeps one valid active draft', () => {
  const current = composerSessionReducer(state(), { type: 'replaceDrafts', drafts: [] });
  assert.equal(current.drafts.length, 1);
  assert.equal(current.activeDraftId, current.drafts[0].id);
  assert.equal(current.drafts[0].params.prompt, '');
});

test('patching params of one draft does not affect another draft', () => {
  let current = composerSessionReducer(state(), { type: 'duplicateDraft', id: 'draft-1', newId: 'draft-2' });
  current = composerSessionReducer(current, {
    type: 'patchDraftParams',
    id: 'draft-2',
    patch: { prompt: 'second-only', n: 7 }
  });

  assert.equal(current.drafts[0].params.prompt, 'initial');
  assert.equal(current.drafts[0].params.n, defaultImageParams.n);
  assert.equal(current.drafts[1].params.prompt, 'second-only');
  assert.equal(current.drafts[1].params.n, 7);
});

test('duplicate owns independent params and reference image arrays', () => {
  const file = new File(['image'], 'reference.png', { type: 'image/png' });
  let current = composerSessionReducer(state(), {
    type: 'patchDraft',
    id: 'draft-1',
    patch: { referenceImages: [file] }
  });
  current = composerSessionReducer(current, { type: 'duplicateDraft', id: 'draft-1', newId: 'draft-2' });

  const [source, duplicate] = current.drafts;
  assert.notEqual(source.params, duplicate.params);
  assert.notEqual(source.referenceImages, duplicate.referenceImages);
  assert.equal(source.referenceImages[0], duplicate.referenceImages[0]);
});

test('unknown draft patches are no-ops without revision changes', () => {
  const current = state();
  const next = composerSessionReducer(current, {
    type: 'patchDraftParams',
    id: 'missing',
    patch: { prompt: 'ignored' }
  });
  assert.equal(next, current);
  assert.equal(next.revision, 0);
});

test('session revision grows only for user mutations and blocks late seeding', () => {
  let current = state();
  const hydratedSeed: ComposerDraftSeed = {
    ...seed,
    params: { ...seed.params, prompt: 'remote' },
    selectedModelId: 'remote-model'
  };

  current = composerSessionReducer(current, { type: 'seedUntouchedSession', seed: hydratedSeed });
  assert.equal(current.revision, 0);
  assert.equal(current.drafts[0].params.prompt, 'remote');
  assert.equal(current.drafts[0].selectedModelId, 'remote-model');

  current = composerSessionReducer(current, {
    type: 'patchDraftParams',
    id: current.activeDraftId,
    patch: { prompt: 'local edit' }
  });
  assert.equal(current.revision, 1);

  const afterLateSeed = composerSessionReducer(current, {
    type: 'seedUntouchedSession',
    seed: { ...hydratedSeed, params: { ...hydratedSeed.params, prompt: 'late remote' } }
  });
  assert.equal(afterLateSeed, current);
  assert.equal(afterLateSeed.drafts[0].params.prompt, 'local edit');
});

test('compatibility notice follows current transition semantics', () => {
  let current = composerSessionReducer(state(), {
    type: 'setCompatibilityNotice',
    notice: 'Adjusted'
  });
  assert.equal(current.compatibilityNotice, 'Adjusted');

  current = composerSessionReducer(current, { type: 'addDraft', id: 'draft-2' });
  assert.equal(current.compatibilityNotice, null);

  current = composerSessionReducer(current, {
    type: 'setCompatibilityNotice',
    notice: 'Still adjusted'
  });
  current = composerSessionReducer(current, {
    type: 'patchDraftParams',
    id: 'draft-1',
    patch: { prompt: 'other draft' }
  });
  assert.equal(current.compatibilityNotice, 'Still adjusted');

  current = composerSessionReducer(current, { type: 'selectDraft', id: 'draft-1' });
  assert.equal(current.compatibilityNotice, null);
});
