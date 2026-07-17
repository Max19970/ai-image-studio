import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function task(id: string, status: string, createdAt: number) {
  return {
    id,
    kind: 'single',
    status,
    createdAt,
    updatedAt: createdAt,
    request: {
      createdAt,
      mode: 'generate',
      prompt: id,
      endpoint: '/api/test',
      providerLabel: 'Test provider',
      model: 'image-model',
      modelLabel: 'image-model',
      payload: {},
      warnings: [],
      attachments: [],
      params: {}
    },
    images: []
  };
}

test('runtime storage read returns all active rows plus the configured completed tail', async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-runtime-retention-'));
  const originalDbPath = process.env.IMAGE_STUDIO_DB_PATH;
  const originalStorageKey = process.env.IMAGE_STUDIO_STORAGE_KEY;
  const originalStorageKeyFile = process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  delete process.env.IMAGE_STUDIO_STORAGE_KEY_FILE;

  const encryptedStore = await import('../server/storage/encryptedStore.ts');
  const taskStore = await import(`../server/storage/generationTaskStore.ts?runtime-retention=${Date.now()}`);

  try {
    taskStore.saveGenerationTaskHistoryDocuments([
      task('terminal-new', 'succeeded', 5),
      task('active-running', 'running', 4),
      task('terminal-old', 'failed', 3),
      task('active-queued', 'queued', 2)
    ]);

    const runtime = taskStore.loadGenerationTaskRuntimeHistoryDocuments(1, 'metadata').tasks as any[];
    assert.deepEqual(runtime.map((item) => item.id), ['terminal-new', 'active-running', 'active-queued']);

    const paginated = taskStore.loadGenerationTaskHistoryDocuments({ limit: 10, assetMode: 'metadata' }).tasks as any[];
    assert.deepEqual(paginated.map((item) => item.id), ['terminal-new', 'terminal-old']);
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
