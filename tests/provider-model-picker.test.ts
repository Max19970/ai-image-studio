import test from 'node:test';
import assert from 'node:assert/strict';
import type { ProviderModelGroup } from '../src/entities/provider/modelOptions';
import {
  buildProviderModelPickerRows,
  filterProviderModelGroups,
  getProviderModelPickerVirtualRange,
  indexProviderModelGroups
} from '../src/entities/provider/ui/ProviderModelPicker/providerModelPickerModel';

const groups: ProviderModelGroup[] = [
  {
    providerId: 'openai',
    providerName: 'OpenAI',
    providerAdapterId: 'openai-compatible',
    disabled: false,
    selected: true,
    models: [
      {
        value: 'gpt-image-2',
        label: 'GPT Image 2',
        description: 'gpt-image-2 · OpenAI',
        providerId: 'openai',
        providerName: 'OpenAI',
        modelId: 'gpt-image-2'
      },
      {
        value: 'dall-e-3',
        label: 'DALL-E 3',
        description: 'dall-e-3 · OpenAI',
        providerId: 'openai',
        providerName: 'OpenAI',
        modelId: 'dall-e-3'
      }
    ]
  },
  {
    providerId: 'local',
    providerName: 'Local ComfyUI',
    providerAdapterId: 'comfyui',
    disabled: false,
    selected: false,
    models: [
      {
        value: 'flux-dev',
        label: 'Flux Dev',
        description: 'flux1-dev.safetensors · Local ComfyUI',
        providerId: 'local',
        providerName: 'Local ComfyUI',
        modelId: 'flux1-dev.safetensors'
      }
    ]
  }
];

test('provider model picker search matches provider and model metadata', () => {
  const indexed = indexProviderModelGroups(groups);
  const providerMatch = filterProviderModelGroups(indexed, 'comfyui');
  assert.deepEqual(providerMatch.map((group) => group.providerId), ['local']);

  const modelMatch = filterProviderModelGroups(indexed, 'flux safetensors');
  assert.deepEqual(modelMatch.map((group) => group.models.map((model) => model.value)), [['flux-dev']]);

  const normalizedMatch = filterProviderModelGroups(indexed, 'dall e');
  assert.deepEqual(normalizedMatch.map((group) => group.models.map((model) => model.value)), [['dall-e-3']]);
});

test('provider model picker rows expose provider jumps and model order', () => {
  const model = buildProviderModelPickerRows(groups, 'comfortable');
  assert.equal(model.rows[0].kind, 'group');
  assert.equal(model.groupOffsets.get('openai'), 0);
  assert.ok((model.groupOffsets.get('local') ?? 0) > 0);
  assert.deepEqual(model.selectableModelIds, ['gpt-image-2', 'dall-e-3', 'flux-dev']);
});

test('provider model picker virtual range expands in scroll direction', () => {
  const largeGroups: ProviderModelGroup[] = Array.from({ length: 18 }, (_, groupIndex) => ({
    providerId: `provider-${groupIndex}`,
    providerName: `Provider ${groupIndex}`,
    disabled: false,
    selected: false,
    models: Array.from({ length: 90 }, (_, modelIndex) => ({
      value: `model-${groupIndex}-${modelIndex}`,
      label: `Model ${groupIndex}-${modelIndex}`,
      description: `model-${groupIndex}-${modelIndex}`,
      providerId: `provider-${groupIndex}`,
      providerName: `Provider ${groupIndex}`,
      modelId: `model-${groupIndex}-${modelIndex}`
    }))
  }));
  const model = buildProviderModelPickerRows(largeGroups, 'compact');
  const slowRange = getProviderModelPickerVirtualRange({
    rows: model.rows,
    scrollTop: 12000,
    viewportHeight: 420,
    direction: 1,
    velocity: 0.2
  });
  const fastRange = getProviderModelPickerVirtualRange({
    rows: model.rows,
    scrollTop: 12000,
    viewportHeight: 420,
    direction: 1,
    velocity: 8
  });

  assert.ok(fastRange.afterOverscan > slowRange.afterOverscan);
  assert.ok(fastRange.afterOverscan > fastRange.beforeOverscan);
  assert.ok(model.rows.length > 1500);
});
