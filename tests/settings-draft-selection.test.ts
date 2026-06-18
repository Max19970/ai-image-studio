import assert from 'node:assert/strict';
import test from 'node:test';
import type { StudioSettings } from '../src/domain/studioSettings';
import {
  firstModelForProvider,
  resolveInitialModelId,
  resolveInitialProviderId,
  resolveSafeSelectedModelId
} from '../src/features/settings/model/settingsDraftSelection';

const settings: StudioSettings = {
  providers: [
    { id: 'provider-a', name: 'Provider A', adapterId: 'openai-compatible', generationEndpoint: '/a', editEndpoint: '/a/edit', responsesEndpoint: '', apiKey: '', authHeaderName: 'Authorization', authScheme: 'Bearer', customHeadersJson: '', timeoutMs: 120000, persistApiKey: false },
    { id: 'provider-b', name: 'Provider B', adapterId: 'openai-compatible', generationEndpoint: '/b', editEndpoint: '/b/edit', responsesEndpoint: '', apiKey: '', authHeaderName: 'Authorization', authScheme: 'Bearer', customHeadersJson: '', timeoutMs: 120000, persistApiKey: false }
  ],
  models: [
    { id: 'model-a', name: 'Model A', providerId: 'provider-a', modelId: 'model-a', notes: '' },
    { id: 'model-b', name: 'Model B', providerId: 'provider-b', modelId: 'model-b', notes: '' }
  ],
  selectedModelId: 'model-b',
  interfaceTheme: 'glass'
};

test('settings draft selection resolves selected provider from selected model', () => {
  assert.equal(resolveInitialModelId(settings), 'model-b');
  assert.equal(resolveInitialProviderId(settings), 'provider-b');
});

test('settings draft selection falls back to first available model and provider', () => {
  const invalidSelection = { ...settings, selectedModelId: 'missing-model' };

  assert.equal(resolveInitialModelId(invalidSelection), 'missing-model');
  assert.equal(resolveInitialProviderId(invalidSelection), 'provider-a');
  assert.equal(resolveSafeSelectedModelId(invalidSelection, 'missing-model'), 'model-a');
});

test('settings draft selection finds the first model for a provider', () => {
  assert.deepEqual(firstModelForProvider(settings, 'provider-a'), settings.models[0]);
  assert.equal(firstModelForProvider(settings, 'unknown-provider'), null);
});
