import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('gallery folder rename remaps the complete subtree and rejects sibling conflicts', async () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'image-studio-gallery-folders-'));
  const originalDbPath = process.env.IMAGE_STUDIO_DB_PATH;
  const originalStorageKey = process.env.IMAGE_STUDIO_STORAGE_KEY;
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const encryptedStore = await import('../server/storage/encryptedStore.ts');
  const store = await import(`../server/storage/galleryFoldersStore.ts?case=${Date.now()}`);
  const metadataStore = await import(`../server/storage/galleryMetadataStore.ts?case=${Date.now()}`);

  try {
    store.createGalleryFolder('/', 'Characters');
    store.createGalleryFolder('/Characters', 'Alice');
    store.createGalleryFolder('/Characters/Alice', 'Portraits');
    store.createGalleryFolder('/Characters', 'Bob');
    store.createGalleryFolder('/', 'Archive');
    metadataStore.setGalleryItemPinned({ itemKind: 'folder', itemId: '/Characters/Alice', pinned: true });
    metadataStore.setGalleryItemTags({ itemKind: 'folder', itemId: '/Characters/Alice/Portraits', tags: ['portrait'] });

    const result = store.renameGalleryFolder('/Characters/Alice', 'Furina');
    metadataStore.remapGalleryFolderMetadata(result.sourcePath, result.nextPath);
    assert.equal(result.sourcePath, '/Characters/Alice');
    assert.equal(result.nextPath, '/Characters/Furina');
    assert.deepEqual(
      result.folders.map((folder) => folder.path).sort(),
      ['/Archive', '/Characters', '/Characters/Bob', '/Characters/Furina', '/Characters/Furina/Portraits']
    );

    assert.deepEqual(metadataStore.loadGalleryPins().map((item) => item.itemId), ['/Characters/Furina']);
    assert.deepEqual(metadataStore.loadGalleryTagRecords().map((item) => item.itemId), ['/Characters/Furina/Portraits']);

    assert.throws(
      () => store.renameGalleryFolder('/Characters/Furina', 'Bob'),
      /already exists|not found|name/i
    );
  } finally {
    store.clearGalleryFolders();
    encryptedStore.closeStorageDbForTests();
    if (originalDbPath === undefined) delete process.env.IMAGE_STUDIO_DB_PATH;
    else process.env.IMAGE_STUDIO_DB_PATH = originalDbPath;
    if (originalStorageKey === undefined) delete process.env.IMAGE_STUDIO_STORAGE_KEY;
    else process.env.IMAGE_STUDIO_STORAGE_KEY = originalStorageKey;
    rmSync(tempDir, { recursive: true, force: true });
  }
});
