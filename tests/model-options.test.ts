import test from 'node:test';
import assert from 'node:assert/strict';
import type { GenerationModel, GenerationProvider } from '../src/domain/providerSettings';
import { getFirstModelIdForProviderGroup, getProviderModelGroups, getProviderModelOptions, getSelectedModel } from '../src/entities/provider/modelOptions';

const providers: GenerationProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI compatible',
    adapterId: 'openai-compatible',
    generationEndpoint: 'https://example.test/v1/images/generations',
    editEndpoint: 'https://example.test/v1/images/edits',
    responsesEndpoint: 'https://example.test/v1/responses',
    apiKey: '',
    authHeaderName: 'Authorization',
    authScheme: 'Bearer',
    customHeadersJson: '',
    timeoutMs: 240000,
    persistApiKey: false
  },
  {
    id: 'empty-local',
    name: 'Empty local provider',
    adapterId: 'openai-compatible',
    generationEndpoint: 'http://127.0.0.1:8188',
    editEndpoint: 'http://127.0.0.1:8188',
    responsesEndpoint: '',
    apiKey: '',
    authHeaderName: 'Authorization',
    authScheme: 'Bearer',
    customHeadersJson: '',
    timeoutMs: 240000,
    persistApiKey: false
  }
];

const models: GenerationModel[] = [
  {
    id: 'gpt-image-2',
    providerId: 'openai',
    modelId: 'gpt-image-2',
    name: 'GPT Image 2',
    notes: ''
  },
  {
    id: 'fallback',
    providerId: 'missing-provider',
    modelId: 'fallback-model',
    name: '',
    notes: ''
  }
];

test('provider model options include provider metadata for the two-step picker', () => {
  assert.deepEqual(getProviderModelOptions(models, providers), [
    {
      value: 'gpt-image-2',
      label: 'GPT Image 2',
      description: 'gpt-image-2 · OpenAI compatible',
      providerId: 'openai',
      providerName: 'OpenAI compatible',
      modelId: 'gpt-image-2'
    },
    {
      value: 'fallback',
      label: 'fallback-model',
      description: 'fallback-model · Provider',
      providerId: 'missing-provider',
      providerName: 'Provider',
      modelId: 'fallback-model'
    }
  ]);
});

test('provider model groups keep empty providers visible and collect orphan models separately', () => {
  const groups = getProviderModelGroups(models, providers, 'gpt-image-2');
  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map((group) => [group.providerId, group.models.length, group.disabled, group.selected]), [
    ['openai', 1, false, true],
    ['empty-local', 0, true, false],
    ['__unknown__', 1, false, false]
  ]);
  assert.equal(getFirstModelIdForProviderGroup(groups[0]), 'gpt-image-2');
  assert.equal(getFirstModelIdForProviderGroup(groups[1]), null);
});

test('selected model falls back to the first available model', () => {
  assert.equal(getSelectedModel(models, 'gpt-image-2')?.id, 'gpt-image-2');
  assert.equal(getSelectedModel(models, 'unknown')?.id, 'gpt-image-2');
  assert.equal(getSelectedModel([], 'unknown'), null);
});
