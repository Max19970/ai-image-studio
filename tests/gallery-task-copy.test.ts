import assert from 'node:assert/strict';
import test from 'node:test';
import type { GenerationTask } from '../src/domain/generationTask';
import { cloneGenerationTaskForGalleryCopy } from '../server/gallery/taskCopy';

function sourceTask(): GenerationTask {
  const request = {
    createdAt: 1,
    mode: 'generate' as const,
    prompt: 'source',
    endpoint: '/generate',
    providerLabel: 'Provider',
    model: 'model',
    modelLabel: 'Model',
    payload: { nested: { value: 1 } },
    warnings: ['warning'],
    attachments: [{ role: 'reference' as const, name: 'ref.png', size: 4, type: 'image/png' }],
    params: { n: 1 },
    providerParams: { nested: { enabled: true } }
  };
  return {
    id: 'source-task',
    kind: 'batch',
    status: 'succeeded',
    galleryPath: '/source',
    galleryPaths: ['/source'],
    createdAt: 1,
    updatedAt: 2,
    request,
    images: [{
      id: 'root-image',
      taskId: 'source-task',
      src: 'data:image/png;base64,QUJDRA==',
      storageAssetKey: 'source-task/image/root/full',
      storageThumbnailKey: 'source-task/image/root/thumbnail',
      storageAssetLoaded: true,
      format: 'png',
      kind: 'final',
      index: 0,
      createdAt: 2,
      raw: { nested: { root: true } },
      request
    }],
    batch: {
      intervalMs: 100,
      items: [{
        id: 'source-item',
        index: 0,
        status: 'succeeded',
        request,
        images: [{
          id: 'batch-image',
          taskId: 'source-task',
          batchItemId: 'source-item',
          src: 'data:image/png;base64,RUZHSA==',
          format: 'png',
          kind: 'final',
          index: 0,
          createdAt: 2,
          raw: { nested: { batch: true } },
          request
        }],
        raw: { nested: { item: true } },
        error: null
      }]
    },
    raw: { nested: { task: true } },
    error: null
  };
}

test('gallery task copy creates an independent task graph with fresh identities and assets', () => {
  const counters = { task: 0, 'batch-item': 0, image: 0 };
  const copy = cloneGenerationTaskForGalleryCopy(sourceTask(), '/target', {
    now: () => 100,
    nextId: (kind) => `${kind}-${++counters[kind]}`
  });
  const source = sourceTask();

  assert.equal(copy.id, 'task-1');
  assert.equal(copy.galleryPath, '/target');
  assert.deepEqual(copy.galleryPaths, ['/target']);
  assert.equal(copy.batch?.items[0].id, 'batch-item-1');
  assert.equal(copy.images[0].id, 'image-2');
  assert.equal(copy.batch?.items[0].images[0].id, 'image-1');
  assert.equal(copy.images[0].storageAssetKey, undefined);
  assert.equal(copy.images[0].storageThumbnailKey, undefined);

  (copy.request.payload.nested as { value: number }).value = 9;
  copy.request.warnings.push('copy-only');
  copy.request.attachments[0].name = 'copy.png';
  (copy.images[0].raw as { nested: { root: boolean } }).nested.root = false;
  (copy.batch!.items[0].request.payload.nested as { value: number }).value = 7;
  (copy.batch!.items[0].raw as { nested: { item: boolean } }).nested.item = false;

  assert.equal((source.request.payload.nested as { value: number }).value, 1);
  assert.deepEqual(source.request.warnings, ['warning']);
  assert.equal(source.request.attachments[0].name, 'ref.png');
  assert.equal((source.images[0].raw as { nested: { root: boolean } }).nested.root, true);
  assert.equal((source.batch!.items[0].request.payload.nested as { value: number }).value, 1);
  assert.equal((source.batch!.items[0].raw as { nested: { item: boolean } }).nested.item, true);
});

test('gallery task copy rejects lazy stored assets instead of creating a broken shared copy', () => {
  const source = sourceTask();
  source.images[0] = {
    ...source.images[0],
    src: '/api/storage/generation-task-asset?key=source',
    storageAssetLoaded: false
  };

  assert.throws(
    () => cloneGenerationTaskForGalleryCopy(source, '/target'),
    /full generation assets/i
  );
});
