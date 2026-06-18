import assert from 'node:assert/strict';
import test from 'node:test';
import type { GenerationTask } from '../src/domain/generationTask';
import { galleryArchivePageSize, galleryTaskImageCount, resolveGalleryArchive } from '../src/features/gallery/model/galleryArchive';

function task(partial: Partial<GenerationTask> & Pick<GenerationTask, 'id'>): GenerationTask {
  const createdAt = partial.createdAt ?? Date.now();
  return {
    id: partial.id,
    kind: partial.kind ?? 'single',
    status: partial.status ?? 'succeeded',
    createdAt,
    updatedAt: partial.updatedAt ?? createdAt,
    request: partial.request ?? {
      createdAt,
      mode: 'generate',
      prompt: '',
      endpoint: '/generate',
      providerLabel: 'Provider',
      model: 'model',
      modelLabel: 'Model',
      payload: {},
      warnings: [],
      attachments: [],
      params: {
        n: 1,
        sizeMode: 'auto',
        sizePreset: '1024x1024',
        width: 1024,
        height: 1024,
        quality: '',
        background: '',
        moderation: '',
        outputFormat: 'png',
        outputCompression: 100,
        stream: false,
        partialImages: 0,
        responseFormat: '',
        inputFidelity: '',
        user: '',
        style: '',
        rawJson: '',
        retryAttempts: 0,
        retryDelaySeconds: 10
      }
    },
    images: partial.images ?? [],
    batch: partial.batch,
    raw: undefined,
    error: partial.error ?? null
  };
}

const image = (id: string, index: number) => ({
  id,
  src: `data:image/png;base64,${id}`,
  format: 'png',
  kind: 'final' as const,
  index,
  createdAt: index
});

test('gallery archive filters by prompt/status/kind', () => {
  const tasks = [
    task({ id: 'a', status: 'succeeded', request: { ...task({ id: 'x' }).request, prompt: 'forest room' }, images: [image('a1', 0)] }),
    task({ id: 'b', status: 'running', request: { ...task({ id: 'x' }).request, prompt: 'city night' } }),
    task({ id: 'c', kind: 'batch', status: 'failed', request: { ...task({ id: 'x' }).request, prompt: 'forest batch' }, images: [image('c1', 0)] })
  ];

  const result = resolveGalleryArchive(tasks, {
    query: 'forest',
    statusFilter: 'terminal',
    kindFilter: 'batch',
    sort: 'newest',
    visibleLimit: galleryArchivePageSize
  });

  assert.deepEqual(result.tasks.map((item) => item.id), ['c']);
  assert.equal(result.summary.totalCount, 3);
  assert.equal(result.summary.filteredCount, 1);
  assert.equal(result.summary.activeCount, 1);
  assert.equal(result.summary.batchCount, 1);
  assert.equal(result.summary.hasFilters, true);
});

test('gallery archive sorts and pages without rendering all tasks', () => {
  const tasks = Array.from({ length: 60 }, (_, index) => task({
    id: `task-${index}`,
    createdAt: index,
    updatedAt: index,
    images: [image(`image-${index}`, 0)]
  }));

  const result = resolveGalleryArchive(tasks, {
    query: '',
    statusFilter: 'all',
    kindFilter: 'all',
    sort: 'newest',
    visibleLimit: galleryArchivePageSize
  });

  assert.equal(result.tasks.length, galleryArchivePageSize);
  assert.equal(result.tasks[0].id, 'task-59');
  assert.equal(result.summary.hasMore, true);
  assert.equal(result.summary.visibleCount, galleryArchivePageSize);
  assert.equal(result.summary.filteredCount, 60);
});

test('gallery archive counts batch images as archive assets', () => {
  const batchTask = task({
    id: 'batch',
    kind: 'batch',
    images: [image('root', 0)],
    batch: {
      intervalMs: 1000,
      items: [
        { id: 'item-1', index: 0, status: 'succeeded', request: task({ id: 'x' }).request, images: [image('a', 0), image('b', 1)] },
        { id: 'item-2', index: 1, status: 'succeeded', request: task({ id: 'x' }).request, images: [image('c', 0)] }
      ]
    }
  });

  assert.equal(galleryTaskImageCount(batchTask), 3);
});
