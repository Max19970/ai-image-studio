import test from 'node:test';
import assert from 'node:assert/strict';
import { cloneWithoutImages, collectImages, restoreTaskImages } from '../server/storage/generation-tasks/generationTaskCodecs';
import type { AssetRow } from '../server/storage/generation-tasks/types';

const topImage = {
  id: 'top-img',
  src: 'data:image/png;base64,QUJDRA==',
  thumbnailSrc: 'data:image/webp;base64,VFhY',
  format: 'png',
  kind: 'final',
  index: 0,
  createdAt: 10
};

const batchImage = {
  id: 'batch-img',
  src: 'data:image/png;base64,QkFUQ0g=',
  thumbnailSrc: 'data:image/webp;base64,QlQ=',
  format: 'png',
  kind: 'final',
  index: 1,
  createdAt: 20
};

function createTask() {
  return {
    id: 'task-1',
    kind: 'batch',
    status: 'succeeded',
    createdAt: 1,
    updatedAt: 2,
    images: [topImage],
    batch: {
      items: [{ id: 'item-1', index: 3, images: [batchImage] }]
    }
  };
}

test('generation task codecs collect full and thumbnail assets without mutating task documents', () => {
  const task = createTask();
  const refs = collectImages(task, 'task-1');

  assert.equal(refs.length, 4);
  assert.deepEqual(refs.map((ref) => ref.documentKey), [
    'task-1/image/top-img/full',
    'task-1/image/top-img/thumbnail',
    'task-1/batch/item-1/image/batch-img/full',
    'task-1/batch/item-1/image/batch-img/thumbnail'
  ]);
  assert.equal(refs.filter((ref) => ref.assetKind === 'thumbnail').length, 2);
  assert.equal(refs[2].batchItemId, 'item-1');
  assert.equal(refs[2].batchItemIndex, 3);

  const cloned = cloneWithoutImages(task);
  assert.deepEqual(cloned.images, []);
  assert.deepEqual(cloned.batch.items[0].images, []);
  assert.equal(task.images.length, 1);
  assert.equal(task.batch.items[0].images.length, 1);
});

test('generation task codecs restore metadata images into root and batch owners', () => {
  const task = cloneWithoutImages(createTask());
  const assets: AssetRow[] = [
    {
      id: 'asset-root-full',
      task_id: 'task-1',
      batch_item_id: null,
      document_key: 'task-1/image/top-img/full',
      image_id: 'top-img',
      image_index: 0,
      kind: 'full',
      format: 'png',
      created_at: 10,
      bytes: 4
    },
    {
      id: 'asset-root-thumb',
      task_id: 'task-1',
      batch_item_id: null,
      document_key: 'task-1/image/top-img/thumbnail',
      image_id: 'top-img',
      image_index: 0,
      kind: 'thumbnail',
      format: 'webp',
      created_at: 10,
      bytes: 2
    },
    {
      id: 'asset-batch-full',
      task_id: 'task-1',
      batch_item_id: 'item-1',
      document_key: 'task-1/batch/item-1/image/batch-img/full',
      image_id: 'batch-img',
      image_index: 1,
      kind: 'full',
      format: 'png',
      created_at: 20,
      bytes: 5
    }
  ];

  const restored = restoreTaskImages(task, assets, 'metadata', () => null);

  assert.equal(restored.images.length, 1);
  assert.equal(restored.images[0].src, '');
  assert.equal(restored.images[0].storageAssetKey, 'task-1/image/top-img/full');
  assert.equal(restored.images[0].storageThumbnailKey, 'task-1/image/top-img/thumbnail');
  assert.equal(restored.batch.items[0].images.length, 1);
  assert.equal(restored.batch.items[0].images[0].batchItemId, 'item-1');
  assert.equal(restored.batch.items[0].images[0].storageAssetLoaded, false);
});
