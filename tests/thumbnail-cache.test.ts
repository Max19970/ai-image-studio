import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearOptimizedThumbnailCacheForTests,
  createOptimizedThumbnail,
  getOptimizedThumbnailCacheSnapshotForTests
} from '../src/shared/image/imageOptimization';

let fakeDataUrlPayloadSize = 32;
let fakeImageLoadCount = 0;

function installBrowserImageMocks() {
  fakeImageLoadCount = 0;

  class FakeImage {
    naturalWidth = 1024;
    naturalHeight = 768;
    width = 1024;
    height = 768;
    decoding = '';
    crossOrigin = '';
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;

    set src(_value: string) {
      fakeImageLoadCount += 1;
      queueMicrotask(() => this.onload?.());
    }
  }

  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: () => ({
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: () => undefined
    }),
    toBlob: (resolve: (value: Blob | null) => void) => resolve(null),
    toDataURL: () => `data:image/jpeg;base64,${'A'.repeat(fakeDataUrlPayloadSize)}`
  };

  (globalThis as any).Image = FakeImage;
  (globalThis as any).document = {
    createElement: (tag: string) => {
      assert.equal(tag, 'canvas');
      return { ...fakeCanvas };
    }
  };
}

test('optimized thumbnail cache uses bounded LRU eviction', async () => {
  installBrowserImageMocks();
  clearOptimizedThumbnailCacheForTests();
  fakeDataUrlPayloadSize = 32;

  for (let index = 0; index < 120; index += 1) {
    await createOptimizedThumbnail(`data:image/png;base64,image-${String(index).padStart(3, '0')}`, 128, 0.8);
  }

  await createOptimizedThumbnail('data:image/png;base64,image-000', 128, 0.8);
  await createOptimizedThumbnail('data:image/png;base64,image-120', 128, 0.8);

  const snapshot = getOptimizedThumbnailCacheSnapshotForTests();
  assert.equal(snapshot.entries, 120);
  assert.equal(snapshot.keys.some((key) => key.includes('image-000')), true);
  assert.equal(snapshot.keys.some((key) => key.includes('image-001')), false);
});

test('optimized thumbnail cache respects retained data url char budget', async () => {
  installBrowserImageMocks();
  clearOptimizedThumbnailCacheForTests();
  fakeDataUrlPayloadSize = 100_000;

  for (let index = 0; index < 100; index += 1) {
    await createOptimizedThumbnail(`data:image/png;base64:large-${String(index).padStart(3, '0')}`, 128, 0.8);
  }

  const snapshot = getOptimizedThumbnailCacheSnapshotForTests();
  assert.ok(snapshot.entries < 100);
  assert.ok(snapshot.valueChars <= 8_000_000);
});

test('thumbnail optimization skip option avoids cache and image work', async () => {
  installBrowserImageMocks();
  clearOptimizedThumbnailCacheForTests();
  fakeDataUrlPayloadSize = 32;

  const value = await createOptimizedThumbnail('data:image/webp;base64,persisted-thumbnail', 128, { skipOptimization: true });

  assert.equal(value, null);
  assert.equal(fakeImageLoadCount, 0);
  assert.equal(getOptimizedThumbnailCacheSnapshotForTests().entries, 0);
});


test('optimized thumbnail cache deduplicates concurrent work for the same source', async () => {
  installBrowserImageMocks();
  clearOptimizedThumbnailCacheForTests();
  fakeDataUrlPayloadSize = 32;

  await Promise.all([
    createOptimizedThumbnail('data:image/png;base64,same-source', 128, 0.8),
    createOptimizedThumbnail('data:image/png;base64,same-source', 128, 0.8),
    createOptimizedThumbnail('data:image/png;base64,same-source', 128, 0.8)
  ]);

  assert.equal(fakeImageLoadCount, 1);
  assert.equal(getOptimizedThumbnailCacheSnapshotForTests().entries, 1);
});
