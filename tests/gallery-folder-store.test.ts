import assert from 'node:assert/strict';
import test from 'node:test';
import {
  remapGalleryFolderMetadataState,
  renameGalleryFolderState
} from '../server/gallery/catalogState';

test('gallery folder rename remaps the complete subtree, metadata and rejects sibling conflicts', () => {
  const folders = [
    { id: '/Archive', path: '/Archive', name: 'Archive', createdAt: 1, updatedAt: 1 },
    { id: '/Characters', path: '/Characters', name: 'Characters', createdAt: 1, updatedAt: 1 },
    { id: '/Characters/Alice', path: '/Characters/Alice', name: 'Alice', createdAt: 1, updatedAt: 1 },
    { id: '/Characters/Alice/Portraits', path: '/Characters/Alice/Portraits', name: 'Portraits', createdAt: 1, updatedAt: 1 },
    { id: '/Characters/Bob', path: '/Characters/Bob', name: 'Bob', createdAt: 1, updatedAt: 1 }
  ];
  const metadata = {
    pins: [{ itemKind: 'folder' as const, itemId: '/Characters/Alice', createdAt: 1 }],
    tags: [{ itemKind: 'folder' as const, itemId: '/Characters/Alice/Portraits', tags: ['portrait'], updatedAt: 1 }]
  };

  const result = renameGalleryFolderState(folders, '/Characters/Alice', 'Furina', 2);
  const remapped = remapGalleryFolderMetadataState(metadata, result.sourcePath, result.nextPath, 2);

  assert.equal(result.sourcePath, '/Characters/Alice');
  assert.equal(result.nextPath, '/Characters/Furina');
  assert.deepEqual(
    result.folders.map((folder) => folder.path),
    ['/Archive', '/Characters', '/Characters/Bob', '/Characters/Furina', '/Characters/Furina/Portraits']
  );
  assert.deepEqual(remapped.pins.map((item) => item.itemId), ['/Characters/Furina']);
  assert.deepEqual(remapped.tags.map((item) => item.itemId), ['/Characters/Furina/Portraits']);

  assert.throws(
    () => renameGalleryFolderState(result.folders, '/Characters/Furina', 'Bob', 3),
    /already exists|not found|name/i
  );
});
