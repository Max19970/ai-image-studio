import assert from 'node:assert/strict';
import test from 'node:test';
import type { GalleryFolder } from '../src/domain/galleryFilesystem';
import {
  createGalleryFolderDraft,
  getGalleryBreadcrumbs,
  getGalleryParentPath,
  joinGalleryPath,
  normalizeGalleryPath
} from '../src/domain/galleryFilesystem';
import type { GenerationTask } from '../src/domain/generationTask';
import { resolveGalleryArchive } from '../src/features/gallery/model/galleryArchive';

function task(partial: Partial<GenerationTask> & Pick<GenerationTask, 'id'>): GenerationTask {
  const createdAt = partial.createdAt ?? Date.now();
  return {
    id: partial.id,
    kind: partial.kind ?? 'single',
    status: partial.status ?? 'succeeded',
    galleryPath: partial.galleryPath,
    galleryPaths: partial.galleryPaths,
    createdAt,
    updatedAt: partial.updatedAt ?? createdAt,
    request: partial.request ?? {
      createdAt,
      mode: 'generate',
      prompt: partial.id,
      endpoint: '/generate',
      providerLabel: 'Provider',
      model: 'model',
      modelLabel: 'Model',
      payload: {},
      warnings: [],
      attachments: [],
      params: {}
    },
    images: partial.images ?? [],
    batch: partial.batch,
    raw: undefined,
    error: partial.error ?? null
  };
}

const folder = (path: string): GalleryFolder => ({
  id: normalizeGalleryPath(path),
  path: normalizeGalleryPath(path),
  name: normalizeGalleryPath(path).split('/').filter(Boolean).at(-1) ?? 'Folder',
  createdAt: 1,
  updatedAt: 1
});

test('gallery filesystem normalizes paths and folder drafts', () => {
  assert.equal(normalizeGalleryPath(''), '/');
  assert.equal(normalizeGalleryPath('///Characters// Alice /./../Portraits'), '/Characters/Alice/Portraits');
  assert.equal(joinGalleryPath('/Characters', ' Alice / Portraits '), '/Characters/Alice Portraits');
  assert.equal(getGalleryParentPath('/Characters/Alice'), '/Characters');
  assert.deepEqual(getGalleryBreadcrumbs('/A/B').map((crumb) => crumb.path), ['/', '/A', '/A/B']);

  const draft = createGalleryFolderDraft('/Characters', 'Alice');
  assert.equal(draft?.path, '/Characters/Alice');
  assert.equal(draft?.id, '/Characters/Alice');
});

test('gallery archive resolves folders and tasks as abstract items in active path', () => {
  const folders = [folder('/Characters'), folder('/Characters/Alice'), folder('/Props')];
  const tasks = [
    task({ id: 'root-task', galleryPath: '/' }),
    task({ id: 'alice-task', galleryPath: '/Characters/Alice' }),
    task({ id: 'props-task', galleryPath: '/Props' })
  ];

  const root = resolveGalleryArchive(tasks, {
    query: '',
    statusFilter: 'all',
    kindFilter: 'all',
    sort: 'newest',
    visibleLimit: 48
  }, { folders, activePath: '/' });

  assert.deepEqual(root.items.map((item) => item.kind === 'folder' ? item.path : item.task.id), ['/Characters', '/Props', 'root-task']);
  assert.equal(root.summary.totalCount, 3);

  const alice = resolveGalleryArchive(tasks, {
    query: '',
    statusFilter: 'all',
    kindFilter: 'all',
    sort: 'newest',
    visibleLimit: 48
  }, { folders, activePath: '/Characters/Alice' });

  assert.deepEqual(alice.items.map((item) => item.kind === 'task' ? item.task.id : item.path), ['alice-task']);
});

test('gallery archive can render one task through multiple filesystem paths', () => {
  const folders = [folder('/A'), folder('/B')];
  const shared = task({ id: 'shared-task', galleryPaths: ['/A', '/B'] });

  const a = resolveGalleryArchive([shared], {
    query: '',
    statusFilter: 'all',
    kindFilter: 'all',
    sort: 'newest',
    visibleLimit: 48
  }, { folders, activePath: '/A' });
  const b = resolveGalleryArchive([shared], {
    query: '',
    statusFilter: 'all',
    kindFilter: 'all',
    sort: 'newest',
    visibleLimit: 48
  }, { folders, activePath: '/B' });

  assert.equal(a.items.find((item) => item.kind === 'task')?.id, 'shared-task@/A');
  assert.equal(b.items.find((item) => item.kind === 'task')?.id, 'shared-task@/B');
});

test('gallery archive keeps folders out of status and kind filtered task views', () => {
  const result = resolveGalleryArchive([task({ id: 'running', status: 'running' })], {
    query: '',
    statusFilter: 'active',
    kindFilter: 'all',
    sort: 'newest',
    visibleLimit: 48
  }, { folders: [folder('/Characters')], activePath: '/' });

  assert.deepEqual(result.items.map((item) => item.kind === 'task' ? item.task.id : item.path), ['running']);
  assert.equal(result.summary.filteredCount, 1);
});
