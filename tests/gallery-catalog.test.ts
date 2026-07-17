import assert from 'node:assert/strict';
import test from 'node:test';
import type { GalleryFolder } from '../src/domain/galleryFilesystem';
import type { GalleryPinItem, GalleryTagRecord } from '../src/entities/gallery/galleryMetadata';
import {
  createGalleryCatalog,
  type GalleryCatalogDependencies,
  type GalleryCatalogMetadataCopyMapping
} from '../server/gallery/catalog';

function folder(path: string): GalleryFolder {
  return { id: path, path, name: path.split('/').filter(Boolean).at(-1) ?? '/', createdAt: 1, updatedAt: 1 };
}

function createHarness() {
  const calls: string[] = [];
  const copiedMetadata: GalleryCatalogMetadataCopyMapping[][] = [];
  const deletedMetadata: Array<{ folderPath?: string; taskIds?: string[] }> = [];
  const folders = [folder('/source')];
  const pins: GalleryPinItem[] = [];
  const tags: GalleryTagRecord[] = [];

  const dependencies: GalleryCatalogDependencies = {
    folders: {
      load: () => folders,
      create: (parentPath, name) => ({ folder: folder(`${parentPath === '/' ? '' : parentPath}/${name}`), folders }),
      rename: (path, name) => ({ folders, sourcePath: path, nextPath: `/${name}` }),
      delete: () => folders,
      moveItem: () => ({ folders, sourcePath: '/source', nextPath: '/target/source' }),
      pasteItems: () => ({
        folders: [folder('/source'), folder('/target/source')],
        mappings: [{ itemKind: 'folder', itemId: '/source', sourcePath: '/source', nextPath: '/target/source' }]
      })
    },
    metadata: {
      loadPins: () => pins,
      loadTags: () => tags,
      setPinned: () => pins,
      setTags: () => tags,
      remapFolder: (sourcePath, nextPath) => calls.push(`metadata:remap:${sourcePath}->${nextPath}`),
      copyItems: (mappings) => {
        copiedMetadata.push(mappings);
        calls.push('metadata:copy');
      },
      deleteItems: (selection) => {
        deletedMetadata.push(selection);
        calls.push('metadata:delete');
      }
    },
    generationTasks: {
      moveGalleryTask: async (taskId, targetPath) => { calls.push(`tasks:move:${taskId}->${targetPath}`); },
      moveGalleryFolderTasks: async (sourcePath, nextPath) => { calls.push(`tasks:remap:${sourcePath}->${nextPath}`); },
      pasteGalleryItems: async () => {
        calls.push('tasks:paste');
        return { copiedTasks: [{ sourceTaskId: 'source-task', nextTaskId: 'copy-task' }] };
      },
      deleteGalleryFolderTasks: async () => {
        calls.push('tasks:delete');
        return { deletedTaskIds: ['deleted-task'] };
      }
    }
  };

  return { catalog: createGalleryCatalog(dependencies), calls, copiedMetadata, deletedMetadata };
}

test('GalleryCatalog owns folder rename coordination across tasks and metadata', async () => {
  const { catalog, calls } = createHarness();

  const result = await catalog.renameFolder('/source', 'renamed');

  assert.equal(result.sourcePath, '/source');
  assert.equal(result.nextPath, '/renamed');
  assert.deepEqual(calls, [
    'tasks:remap:/source->/renamed',
    'metadata:remap:/source->/renamed'
  ]);
});

test('GalleryCatalog copy duplicates folder and task metadata onto copied identities', async () => {
  const { catalog, calls, copiedMetadata } = createHarness();

  const result = await catalog.pasteItems({
    operation: 'copy',
    targetPath: '/target',
    items: [{ itemKind: 'folder', itemId: '/source', sourcePath: '/source' }]
  });

  assert.deepEqual(result.folders.map((item) => item.path), ['/source', '/target/source']);
  assert.deepEqual(calls, ['tasks:paste', 'metadata:copy']);
  assert.deepEqual(copiedMetadata, [[
    { itemKind: 'folder', sourceItemId: '/source', nextItemId: '/target/source' },
    { itemKind: 'task', sourceItemId: 'source-task', nextItemId: 'copy-task' }
  ]]);
});

test('GalleryCatalog delete removes metadata for the folder subtree and deleted tasks', async () => {
  const { catalog, calls, deletedMetadata } = createHarness();

  await catalog.deleteFolder('/source');

  assert.deepEqual(calls, ['tasks:delete', 'metadata:delete']);
  assert.deepEqual(deletedMetadata, [{ folderPath: '/source', taskIds: ['deleted-task'] }]);
});
