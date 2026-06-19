import test from 'node:test';
import assert from 'node:assert/strict';
import type { GenerationModel, GenerationProvider } from '../src/domain/providerSettings';
import { getProviderModelOptions, getSelectedModel } from '../src/entities/provider/modelOptions';

const providers: GenerationProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI compatible',
    endpoint: 'https://example.test/v1/images/generations',
    apiKey: '',
    headers: [],
    enabled: true
  }
];

const models: GenerationModel[] = [
  {
    id: 'gpt-image-2',
    providerId: 'openai',
    modelId: 'gpt-image-2',
    name: 'GPT Image 2',
    enabled: true
  },
  {
    id: 'fallback',
    providerId: 'missing-provider',
    modelId: 'fallback-model',
    name: '',
    enabled: true
  }
];

test('provider model options are derived with a provider lookup table', () => {
  assert.deepEqual(getProviderModelOptions(models, providers), [
    {
      value: 'gpt-image-2',
      label: 'GPT Image 2',
      description: 'gpt-image-2 · OpenAI compatible'
    },
    {
      value: 'fallback',
      label: 'fallback-model',
      description: 'fallback-model'
    }
  ]);
});

test('selected model falls back to the first available model', () => {
  assert.equal(getSelectedModel(models, 'gpt-image-2')?.id, 'gpt-image-2');
  assert.equal(getSelectedModel(models, 'unknown')?.id, 'gpt-image-2');
  assert.equal(getSelectedModel([], 'unknown'), null);
});
