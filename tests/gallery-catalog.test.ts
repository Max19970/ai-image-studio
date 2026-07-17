import assert from 'node:assert/strict';
import test from 'node:test';
import type { GenerationTask } from '../src/domain/generationTask';
import type { GalleryCatalogDocumentsState } from '../server/gallery/catalogState';
import { createGalleryCatalog, type GalleryCatalogMutation } from '../server/gallery/catalog';

function task(id: string, galleryPath: string): GenerationTask {
  return {
    id,
    kind: 'single',
    status: 'succeeded',
    galleryPath,
    galleryPaths: [galleryPath],
    createdAt: 1,
    updatedAt: 1,
    request: {
      createdAt: 1,
      mode: 'generate',
      prompt: id,
      endpoint: '/generate',
      providerLabel: 'Provider',
      model: 'model',
      modelLabel: 'Model',
      payload: {},
      warnings: [],
      attachments: [],
      params: {}
    },
    images: []
  };
}

function createHarness() {
  let tasks = [task('source-task', '/source')];
  let documents: GalleryCatalogDocumentsState = {
    folders: [
      { id: '/source', path: '/source', name: 'source', createdAt: 1, updatedAt: 1 },
      { id: '/source/nested', path: '/source/nested', name: 'nested', createdAt: 1, updatedAt: 1 }
    ],
    pins: [
      { itemKind: 'folder', itemId: '/source', createdAt: 1 },
      { itemKind: 'task', itemId: 'source-task', createdAt: 1 }
    ],
    tags: [
      { itemKind: 'folder', itemId: '/source/nested', tags: ['nested'], updatedAt: 1 },
      { itemKind: 'task', itemId: 'source-task', tags: ['task'], updatedAt: 1 }
    ]
  };
  let commits = 0;

  const catalog = createGalleryCatalog({
    readDocuments: () => structuredClone(documents),
    loadFullTasks: async (ids) => tasks.filter((item) => ids.includes(item.id)),
    async commit<TResult>(prepare: (
      currentTasks: GenerationTask[],
      currentDocuments: GalleryCatalogDocumentsState
    ) => Promise<GalleryCatalogMutation<TResult>> | GalleryCatalogMutation<TResult>) {
      const prepared = await prepare(structuredClone(tasks), structuredClone(documents));
      tasks = prepared.tasks;
      documents = prepared.documents;
      commits += 1;
      return prepared.result;
    }
  });

  return {
    catalog,
    readTasks: () => tasks,
    readDocuments: () => documents,
    readCommits: () => commits
  };
}

test('GalleryCatalog rename changes tasks and folder metadata in one aggregate commit', async () => {
  const harness = createHarness();

  const result = await harness.catalog.renameFolder('/source', 'renamed');

  assert.equal(result.nextPath, '/renamed');
  assert.deepEqual(harness.readTasks()[0].galleryPaths, ['/renamed']);
  assert.deepEqual(harness.readDocuments().folders.map((item) => item.path), ['/renamed', '/renamed/nested']);
  assert.deepEqual(harness.readDocuments().pins.map((item) => item.itemId).sort(), ['/renamed', 'source-task']);
  assert.deepEqual(harness.readDocuments().tags.map((item) => item.itemId).sort(), ['/renamed/nested', 'source-task']);
  assert.equal(harness.readCommits(), 1);
});

test('GalleryCatalog copy duplicates folder and task metadata onto copied identities', async () => {
  const harness = createHarness();

  const result = await harness.catalog.pasteItems({
    operation: 'deep-copy',
    targetPath: '/target',
    items: [{ itemKind: 'folder', itemId: '/source', sourcePath: '/source' }]
  });

  const copiedTask = harness.readTasks().find((item) => item.id !== 'source-task');
  assert.ok(copiedTask);
  assert.deepEqual(result.folders.map((item) => item.path), ['/source', '/source/nested', '/target/source', '/target/source/nested']);
  assert.ok(harness.readDocuments().pins.some((item) => item.itemKind === 'folder' && item.itemId === '/target/source'));
  assert.ok(harness.readDocuments().pins.some((item) => item.itemKind === 'task' && item.itemId === copiedTask.id));
  assert.ok(harness.readDocuments().tags.some((item) => item.itemKind === 'folder' && item.itemId === '/target/source/nested'));
  assert.ok(harness.readDocuments().tags.some((item) => item.itemKind === 'task' && item.itemId === copiedTask.id));
  assert.equal(harness.readCommits(), 1);
});

test('GalleryCatalog delete removes folder subtree, orphan tasks and related metadata together', async () => {
  const harness = createHarness();

  await harness.catalog.deleteFolder('/source');

  assert.deepEqual(harness.readTasks(), []);
  assert.deepEqual(harness.readDocuments(), { folders: [], pins: [], tags: [] });
  assert.equal(harness.readCommits(), 1);
});
