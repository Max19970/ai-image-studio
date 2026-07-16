import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGroupedPickerRows,
  filterGroupedPickerGroups,
  getGroupedPickerVirtualRange,
  indexGroupedPickerGroups,
  type GroupedPickerGroup
} from '../src/shared/ui/GroupedPicker/groupedPickerModel';

const groups: GroupedPickerGroup[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'openai-compatible',
    items: [
      { id: 'gpt-image-2', label: 'GPT Image 2', description: 'gpt-image-2' },
      { id: 'dall-e-3', label: 'DALL-E 3', description: 'dall-e-3' }
    ]
  },
  {
    id: 'local',
    label: 'Local ComfyUI',
    description: 'comfyui',
    items: [
      { id: 'flux-dev', label: 'Flux Dev', description: 'flux1-dev.safetensors', keywords: ['checkpoint'] },
      { id: 'pony-xl', label: 'Pony XL', description: 'ponyDiffusionV6XL.safetensors' }
    ]
  }
];

test('grouped picker search matches provider metadata and individual model metadata', () => {
  const indexed = indexGroupedPickerGroups(groups);

  const providerMatch = filterGroupedPickerGroups(indexed, 'comfyui');
  assert.deepEqual(providerMatch.map((group) => [group.id, group.items.length]), [['local', 2]]);

  const modelMatch = filterGroupedPickerGroups(indexed, 'checkpoint flux');
  assert.deepEqual(modelMatch.map((group) => group.items.map((item) => item.id)), [['flux-dev']]);

  const normalizedMatch = filterGroupedPickerGroups(indexed, 'dall e');
  assert.deepEqual(normalizedMatch.map((group) => group.items.map((item) => item.id)), [['dall-e-3']]);
});

test('grouped picker rows expose stable group jumps and selectable item order', () => {
  const model = buildGroupedPickerRows(groups, 'comfortable');

  assert.equal(model.rows[0].kind, 'group');
  assert.equal(model.groupOffsets.get('openai'), 0);
  assert.ok((model.groupOffsets.get('local') ?? 0) > 0);
  assert.deepEqual(model.selectableItemIds, ['gpt-image-2', 'dall-e-3', 'flux-dev', 'pony-xl']);
  assert.ok(model.totalSize > 200);
});

test('grouped picker virtual window omits distant rows and expands overscan in scroll direction', () => {
  const largeGroups: GroupedPickerGroup[] = Array.from({ length: 20 }, (_, groupIndex) => ({
    id: `provider-${groupIndex}`,
    label: `Provider ${groupIndex}`,
    items: Array.from({ length: 100 }, (_, itemIndex) => ({
      id: `model-${groupIndex}-${itemIndex}`,
      label: `Model ${groupIndex}-${itemIndex}`
    }))
  }));
  const model = buildGroupedPickerRows(largeGroups, 'compact');
  const slowRange = getGroupedPickerVirtualRange({
    rows: model.rows,
    scrollTop: 12000,
    viewportHeight: 420,
    direction: 1,
    velocity: 0.2
  });
  const fastRange = getGroupedPickerVirtualRange({
    rows: model.rows,
    scrollTop: 12000,
    viewportHeight: 420,
    direction: 1,
    velocity: 8
  });

  assert.ok(slowRange.endIndex - slowRange.startIndex < 80);
  assert.ok(fastRange.endIndex - fastRange.startIndex < 100);
  assert.ok(fastRange.afterOverscan > slowRange.afterOverscan);
  assert.ok(fastRange.afterOverscan > fastRange.beforeOverscan);
  assert.ok(model.rows.length > 2000);
});
