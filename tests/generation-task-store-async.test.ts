import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const originalDbPath = process.env.IMAGE_STUDIO_DB_PATH;
const originalStorageKey = process.env.IMAGE_STUDIO_STORAGE_KEY;
const originalStorageKeyFile = process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;
const storageTempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-store-async-test-'));
process.env.IMAGE_STUDIO_DB_PATH = path.join(storageTempDir, 'storage.sqlite');
process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
delete process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;

const generationTaskStore = await import('../server/storage/generationTaskStore');
const { loadGenerationTaskHistoryDocumentsAsync, closeGenerationTaskStoreWorkerForTests } = await import('../server/storage/generationTaskStoreAsync');
const { closeStorageDbForTests } = await import('../server/storage/encryptedStore');

after(async () => {
  await closeGenerationTaskStoreWorkerForTests();
  closeStorageDbForTests();
  rmSync(storageTempDir, { recursive: true, force: true });
  if (originalDbPath === undefined) delete process.env.IMAGE_STUDIO_DB_PATH;
  else process.env.IMAGE_STUDIO_DB_PATH = originalDbPath;
  if (originalStorageKey === undefined) delete process.env.IMAGE_STUDIO_STORAGE_KEY;
  else process.env.IMAGE_STUDIO_STORAGE_KEY = originalStorageKey;
  if (originalStorageKeyFile === undefined) delete process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;
  else process.env.IMAGE_STUDIO_STORAGE_KEY_FILE = originalStorageKeyFile;
});

function createStoredTask(index: number) {
  const payload = 'A'.repeat(180_000);
  const createdAt = 10_000 + index;
  return {
    id: `task-${index}`,
    kind: 'single',
    status: 'succeeded',
    createdAt,
    updatedAt: createdAt + 1,
    request: {
      createdAt,
      mode: 'generate',
      prompt: `stored ${index}`,
      endpoint: '/api/generate',
      providerLabel: 'Test provider',
      model: 'image-model',
      modelLabel: 'image-model',
      payload: { prompt: `stored ${index}` },
      warnings: [],
      attachments: [],
      params: {}
    },
    images: [{
      id: `image-${index}`,
      src: `data:image/png;base64,${payload}`,
      thumbnailSrc: `data:image/webp;base64,${payload.slice(0, 12_000)}`,
      format: 'png',
      kind: 'final',
      index: 0,
      createdAt
    }]
  };
}

test('generation task storage worker does not monopolize the server event loop while loading heavy history', async () => {
  generationTaskStore.saveGenerationTaskHistoryDocuments(Array.from({ length: 8 }, (_, index) => createStoredTask(index)));

  const loading = loadGenerationTaskHistoryDocumentsAsync({ limit: 8, offset: 0, assetMode: 'full' });
  const firstSettled = await Promise.race([
    loading.then(() => 'storage-finished' as const),
    new Promise<'event-loop-tick'>((resolve) => setTimeout(() => resolve('event-loop-tick'), 0))
  ]);

  assert.equal(firstSettled, 'event-loop-tick');
  const result = await loading;
  assert.equal(result.tasks.length, 8);
});
