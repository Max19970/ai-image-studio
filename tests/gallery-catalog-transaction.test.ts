import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

function task(id: string, updatedAt: number) {
  return {
    id,
    kind: 'single',
    status: 'succeeded',
    galleryPath: '/source',
    galleryPaths: ['/source'],
    createdAt: 1,
    updatedAt,
    request: {
      createdAt: 1,
      mode: 'generate',
      prompt: id,
      endpoint: '/generate',
      providerLabel: 'Provider',
      model: 'model',
      modelLabel: 'Model',
      payload: { prompt: id },
      warnings: [],
      attachments: [],
      params: {}
    },
    images: []
  };
}

test('gallery catalog transaction rolls back tasks, folders, pins and tags together', async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-gallery-transaction-'));
  const originalDbPath = process.env.IMAGE_STUDIO_DB_PATH;
  const originalStorageKey = process.env.IMAGE_STUDIO_STORAGE_KEY;
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const encryptedStore = await import('../server/storage/encryptedStore.ts');
  const catalogStore = await import(`../server/storage/galleryCatalogStore.ts?transaction=${Date.now()}`);
  const taskStore = await import(`../server/storage/generationTaskStore.ts?transaction=${Date.now()}`);

  try {
    const initial = {
      tasks: [task('task-1', 1)],
      folders: [{ id: '/source', path: '/source', name: 'source', createdAt: 1, updatedAt: 1 }],
      pins: [{ itemKind: 'task' as const, itemId: 'task-1', createdAt: 1 }],
      tags: [{ itemKind: 'folder' as const, itemId: '/source', tags: ['initial'], updatedAt: 1 }]
    };
    catalogStore.saveGalleryCatalogStateDocuments(initial);
    const beforeDocuments = catalogStore.loadGalleryCatalogDocuments();
    const beforeTasks = taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'metadata' }).tasks;

    const db = encryptedStore.getStorageDb();
    db.exec(`
      CREATE TRIGGER fail_gallery_tag_insert
      BEFORE INSERT ON storage_documents
      WHEN NEW.bucket = 'gallery-tag.v1'
      BEGIN
        SELECT RAISE(ABORT, 'forced gallery tag failure');
      END;
      CREATE TRIGGER fail_gallery_tag_update
      BEFORE UPDATE ON storage_documents
      WHEN NEW.bucket = 'gallery-tag.v1'
      BEGIN
        SELECT RAISE(ABORT, 'forced gallery tag failure');
      END;
    `);

    assert.throws(() => catalogStore.saveGalleryCatalogStateDocuments({
      tasks: [task('task-1', 2), task('task-2', 2)],
      folders: [{ id: '/target', path: '/target', name: 'target', createdAt: 2, updatedAt: 2 }],
      pins: [{ itemKind: 'task', itemId: 'task-2', createdAt: 2 }],
      tags: [{ itemKind: 'folder', itemId: '/target', tags: ['changed'], updatedAt: 2 }]
    }), /forced gallery tag failure/i);

    assert.deepEqual(catalogStore.loadGalleryCatalogDocuments(), beforeDocuments);
    assert.deepEqual(taskStore.loadGenerationTaskHistoryDocuments({ assetMode: 'metadata' }).tasks, beforeTasks);
  } finally {
    encryptedStore.closeStorageDbForTests();
    if (originalDbPath === undefined) delete process.env.IMAGE_STUDIO_DB_PATH;
    else process.env.IMAGE_STUDIO_DB_PATH = originalDbPath;
    if (originalStorageKey === undefined) delete process.env.IMAGE_STUDIO_STORAGE_KEY;
    else process.env.IMAGE_STUDIO_STORAGE_KEY = originalStorageKey;
    rmSync(tempDir, { recursive: true, force: true });
  }
});
