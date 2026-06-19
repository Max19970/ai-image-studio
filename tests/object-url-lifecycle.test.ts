import test from 'node:test';
import assert from 'node:assert/strict';
import { collectGenerationTaskObjectUrls } from '../src/domain/generationTaskObjectUrls';
import type { GenerationTask } from '../src/domain/generationTask';
import { createObjectUrlRegistry } from '../src/shared/image/objectUrlRegistry';

function createMinimalTask(): GenerationTask {
  const request = {
    createdAt: 1,
    mode: 'edit' as const,
    prompt: 'Prompt',
    endpoint: 'endpoint',
    providerLabel: 'Provider',
    model: 'model',
    modelLabel: 'Model',
    payload: {},
    warnings: [],
    attachments: [
      { role: 'target' as const, name: 'a.png', size: 10, type: 'image/png', previewUrl: 'blob:target' },
      { role: 'reference' as const, name: 'b.png', size: 20, type: 'image/png', previewUrl: 'data:image/png;base64,AAAA' }
    ],
    params: {
      n: 1,
      sizeMode: 'preset' as const,
      sizePreset: '1024x1024',
      width: 1024,
      height: 1024,
      quality: 'auto' as const,
      background: 'auto' as const,
      moderation: 'auto' as const,
      outputFormat: 'png' as const,
      outputCompression: 100,
      stream: false,
      partialImages: 0,
      responseFormat: 'url' as const,
      inputFidelity: 'auto' as const,
      user: '',
      style: '',
      rawJson: '',
      retryAttempts: 0,
      retryDelaySeconds: 10
    }
  };

  return {
    id: 'task-1',
    kind: 'single',
    status: 'succeeded',
    createdAt: 1,
    updatedAt: 2,
    request,
    images: [{
      id: 'image-1',
      taskId: 'task-1',
      src: 'data:image/png;base64,BBBB',
      thumbnailSrc: 'blob:thumbnail',
      format: 'png',
      kind: 'final',
      index: 0,
      createdAt: 3,
      request
    }]
  };
}

test('object url registry reuses URLs for retained file objects and revokes removed ones', () => {
  const created: string[] = [];
  const revoked: string[] = [];
  const fileA = { name: 'a' };
  const fileB = { name: 'b' };
  const registry = createObjectUrlRegistry<object>({
    createObjectUrl: (item) => {
      const url = `blob:${(item as { name: string }).name}-${created.length + 1}`;
      created.push(url);
      return url;
    },
    revokeObjectUrl: (url) => revoked.push(url)
  });

  assert.equal(registry.reconcile([fileA, fileB]), true);
  assert.deepEqual(created, ['blob:a-1', 'blob:b-2']);
  assert.equal(registry.get(fileA), 'blob:a-1');

  assert.equal(registry.reconcile([fileB, fileA]), false);
  assert.deepEqual(created, ['blob:a-1', 'blob:b-2']);
  assert.deepEqual(revoked, []);

  assert.equal(registry.reconcile([fileB]), true);
  assert.deepEqual(revoked, ['blob:a-1']);
  assert.equal(registry.get(fileB), 'blob:b-2');

  assert.equal(registry.releaseAll(), true);
  assert.deepEqual(revoked, ['blob:a-1', 'blob:b-2']);
});

test('generation task object url collector only returns browser blob URLs from previews and images', () => {
  const urls = collectGenerationTaskObjectUrls(createMinimalTask());

  assert.deepEqual([...urls].sort(), ['blob:target', 'blob:thumbnail']);
});
