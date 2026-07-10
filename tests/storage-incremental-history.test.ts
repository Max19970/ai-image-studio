import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function createTask(id: string, createdAt: number, payload: string) {
  return {
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
      providerLabel: 'Test provider',
      model: 'image-model',
      modelLabel: 'image-model',
      payload: { prompt: id },
      warnings: [],
      attachments: [],
      params: {}
    },
    images: [{
      id: `${id}-image`,
      src: `data:image/png;base64,${payload}`,
      format: 'png',
      kind: 'final',
      index: 0,
      createdAt
    }]
  };
}

test('history reconciliation preserves unchanged encrypted assets instead of rewriting the whole database', async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-incremental-history-'));
  const originalDbPath = process.env.IMAGE_STUDIO_DB_PATH;
  const originalStorageKey = process.env.IMAGE_STUDIO_STORAGE_KEY;
  const originalStorageKeyFile = process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  delete process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;

  const encryptedStore = await import('../server/storage/encryptedStore.ts');
  const taskStore = await import(`../server/storage/generationTaskStore.ts?incremental=${Date.now()}`);

  try {
    const first = createTask('first', 100, 'QUJDRA==');
    const second = createTask('second', 200, 'RUZHSA==');
    taskStore.saveGenerationTaskHistoryDocuments([second, first]);

    const metadata = taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'metadata' }).tasks as any[];
    const firstAssetKey = metadata.find((task) => task.id === 'first')?.images?.[0]?.storageAssetKey as string;
    assert.ok(firstAssetKey);
    const before = encryptedStore.getEncryptedDocumentStats(encryptedStore.generationTaskAssetBucket, firstAssetKey);
    assert.ok(before.updatedAt);

    await new Promise<void>((resolve) => setTimeout(resolve, 10));
    const third = createTask('third', 300, 'SUpLTA==');
    taskStore.saveGenerationTaskHistoryDocuments([third, ...metadata]);

    const after = encryptedStore.getEncryptedDocumentStats(encryptedStore.generationTaskAssetBucket, firstAssetKey);
    assert.equal(after.updatedAt, before.updatedAt);

    const stored = taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'metadata' }).tasks as any[];
    assert.deepEqual(stored.map((task) => task.id), ['third', 'second', 'first']);

    taskStore.saveGenerationTaskHistoryDocuments(stored.filter((task) => task.id !== 'first'));
    assert.equal(taskStore.loadGenerationTaskAssetDocument(firstAssetKey), null);
    assert.deepEqual(
      (taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'metadata' }).tasks as any[]).map((task) => task.id),
      ['third', 'second']
    );
  } finally {
    encryptedStore.closeStorageDbForTests();
    rmSync(tempDir, { recursive: true, force: true });
    if (originalDbPath === undefined) delete process.env.IMAGE_STUDIO_DB_PATH;
    else process.env.IMAGE_STUDIO_DB_PATH = originalDbPath;
    if (originalStorageKey === undefined) delete process.env.IMAGE_STUDIO_STORAGE_KEY;
    else process.env.IMAGE_STUDIO_STORAGE_KEY = originalStorageKey;
    if (originalStorageKeyFile === undefined) delete process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;
    else process.env.IMAGE_STUDIO_STORAGE_KEY_FILE = originalStorageKeyFile;
  }
});
