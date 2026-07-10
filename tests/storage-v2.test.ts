import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('Storage v2 saves tasks, full assets, thumbnails, lazy modes and app document buckets', async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-storage-test-'));
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const encryptedStore = await import('../server/storage/encryptedStore.ts');
  const taskStore = await import(`../server/storage/generationTaskStore.ts?case=${Date.now()}`);
  const appStore = await import(`../server/storage/appDocumentStore.ts?case=${Date.now()}`);

  const src = 'data:image/png;base64,QUJDRA==';
  const thumbnailSrc = 'data:image/webp;base64,VFhY';
  const task = {
    id: 'task-1',
    kind: 'single',
    status: 'succeeded',
    createdAt: 100,
    updatedAt: 200,
    request: {
      createdAt: 100,
      mode: 'generate',
      prompt: 'storage test',
      endpoint: '/api/generate',
      providerLabel: 'Provider',
      model: 'model',
      modelLabel: 'Model',
      payload: { prompt: 'storage test' },
      warnings: [],
      attachments: [],
      params: {}
    },
    images: [{ id: 'img-1', src, thumbnailSrc, format: 'png', kind: 'final', index: 0, createdAt: 120 }]
  };

  const saveStats = taskStore.saveGenerationTaskHistoryDocuments([task]);
  assert.equal(saveStats.taskCount, 1);
  assert.equal(saveStats.assetCount, 2);
  assert.equal(saveStats.thumbnailCount, 1);

  const full = taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'full' }).tasks as any[];
  assert.equal(full[0].images[0].src, src);
  assert.equal(full[0].images[0].thumbnailSrc, thumbnailSrc);
  assert.equal(full[0].images[0].storageAssetLoaded, true);

  const thumbnail = taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'thumbnail' }).tasks as any[];
  assert.equal(thumbnail[0].images[0].src, thumbnailSrc);
  assert.equal(thumbnail[0].images[0].storageAssetLoaded, false);
  assert.equal(typeof thumbnail[0].images[0].storageAssetKey, 'string');

  const metadata = taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'metadata' }).tasks as any[];
  assert.equal(metadata[0].images[0].src, '');
  assert.equal(metadata[0].images[0].storageAssetLoaded, false);

  const asset = taskStore.loadGenerationTaskAssetDocument(metadata[0].images[0].storageAssetKey);
  assert.equal(asset?.src, src);

  appStore.saveAppDocument(appStore.studioSettingsBucket, appStore.currentDocumentKey, { selectedModelId: 'model-a' });
  assert.deepEqual(appStore.loadAppDocument(appStore.studioSettingsBucket, appStore.currentDocumentKey, null).value, { selectedModelId: 'model-a' });

  appStore.saveAppDocument(appStore.providerProbeCacheBucket, appStore.currentDocumentKey, { fingerprint: { ok: true } });
  assert.deepEqual(appStore.loadAppDocument(appStore.providerProbeCacheBucket, appStore.currentDocumentKey, {}).value, { fingerprint: { ok: true } });
  appStore.deleteAppDocument(appStore.providerProbeCacheBucket, appStore.currentDocumentKey);
  assert.deepEqual(appStore.loadAppDocument(appStore.providerProbeCacheBucket, appStore.currentDocumentKey, {}).value, {});

  taskStore.clearGenerationTaskHistoryDocuments();
  assert.equal(taskStore.loadGenerationTaskHistoryDocuments().tasks.length, 0);

  encryptedStore.closeStorageDbForTests();
  rmSync(tempDir, { recursive: true, force: true });
});

test('Storage v2 loads selected task ids only', async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-storage-selected-test-'));
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const encryptedStore = await import('../server/storage/encryptedStore.ts');
  const taskStore = await import(`../server/storage/generationTaskStore.ts?case=selected-${Date.now()}`);
  const createTask = (id: string, createdAt: number) => ({
    id,
    kind: 'single',
    status: 'succeeded',
    createdAt,
    updatedAt: createdAt,
    request: {
      createdAt,
      mode: 'generate',
      prompt: id,
      endpoint: '/api/generate',
      providerLabel: 'Provider',
      model: 'model',
      modelLabel: 'Model',
      payload: { prompt: id },
      warnings: [],
      attachments: [],
      params: {}
    },
    images: [{ id: `${id}-image`, src: `data:image/png;base64,${Buffer.from(id).toString('base64')}`, format: 'png', kind: 'final', index: 0, createdAt }]
  });

  taskStore.saveGenerationTaskHistoryDocuments([createTask('task-1', 100), createTask('task-2', 200), createTask('task-3', 300)]);

  const selected = taskStore.loadGenerationTaskHistoryDocumentsByIds(['task-1', 'task-3'], { assetMode: 'metadata' }).tasks as any[];
  assert.deepEqual(selected.map((task) => task.id), ['task-3', 'task-1']);
  assert.deepEqual(selected.map((task) => task.images[0].storageAssetLoaded), [false, false]);
  assert.deepEqual(selected.map((task) => task.images[0].src), ['', '']);

  const empty = taskStore.loadGenerationTaskHistoryDocumentsByIds([], { assetMode: 'full' }).tasks as any[];
  assert.equal(empty.length, 0);

  encryptedStore.closeStorageDbForTests();
  rmSync(tempDir, { recursive: true, force: true });
});
