import type { GenerationStatus, GenerationTask } from '../../../domain/generationTask';
import type { GalleryArchiveSummary, GalleryKindFilter, GallerySortMode, GalleryStatusFilter } from '../../../entities/gallery/archiveTypes';

export const galleryArchivePageSize = 48;

const activeStatuses = new Set<GenerationStatus>(['created', 'queued', 'sending', 'running', 'retrying']);
const terminalStatuses = new Set<GenerationStatus>(['succeeded', 'failed', 'cancelled']);

export interface GalleryArchiveState {
  query: string;
  statusFilter: GalleryStatusFilter;
  kindFilter: GalleryKindFilter;
  sort: GallerySortMode;
  visibleLimit: number;
}


export interface GalleryArchiveResult {
  tasks: GenerationTask[];
  filteredTasks: GenerationTask[];
  summary: GalleryArchiveSummary;
}

export function galleryTaskImageCount(task: GenerationTask): number {
  const batchImages = task.batch?.items.reduce((total, item) => total + item.images.length, 0) ?? 0;
  return Math.max(task.images.length, batchImages);
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function taskMatchesQuery(task: GenerationTask, query: string): boolean {
  const normalized = normalizeSearchText(query);
  if (!normalized) return true;
  const haystack = [
    task.id,
    task.status,
    task.kind ?? 'single',
    task.request.prompt,
    task.request.providerLabel,
    task.request.model,
    task.request.modelLabel,
    task.error ?? '',
    ...(task.batch?.items.map((item) => item.request.prompt) ?? [])
  ].join('\n').toLowerCase();
  return haystack.includes(normalized);
}

function taskMatchesStatus(task: GenerationTask, filter: GalleryStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return activeStatuses.has(task.status);
  if (filter === 'terminal') return terminalStatuses.has(task.status);
  return task.status === filter;
}

function taskMatchesKind(task: GenerationTask, filter: GalleryKindFilter): boolean {
  if (filter === 'all') return true;
  return (task.kind ?? 'single') === filter;
}

function compareTasks(a: GenerationTask, b: GenerationTask, sort: GallerySortMode): number {
  if (sort === 'oldest') return a.createdAt - b.createdAt;
  if (sort === 'updated') return b.updatedAt - a.updatedAt;
  if (sort === 'images') return galleryTaskImageCount(b) - galleryTaskImageCount(a) || b.createdAt - a.createdAt;
  return b.createdAt - a.createdAt;
}

export function resolveGalleryArchive(tasks: GenerationTask[], state: GalleryArchiveState): GalleryArchiveResult {
  const filteredTasks = tasks
    .filter((task) => taskMatchesQuery(task, state.query))
    .filter((task) => taskMatchesStatus(task, state.statusFilter))
    .filter((task) => taskMatchesKind(task, state.kindFilter))
    .sort((a, b) => compareTasks(a, b, state.sort));

  const visibleTasks = filteredTasks.slice(0, Math.max(1, state.visibleLimit));
  const totalImages = tasks.reduce((total, task) => total + galleryTaskImageCount(task), 0);
  const filteredImages = filteredTasks.reduce((total, task) => total + galleryTaskImageCount(task), 0);

  return {
    tasks: visibleTasks,
    filteredTasks,
    summary: {
      totalCount: tasks.length,
      filteredCount: filteredTasks.length,
      visibleCount: visibleTasks.length,
      totalImages,
      filteredImages,
      activeCount: tasks.filter((task) => activeStatuses.has(task.status)).length,
      batchCount: tasks.filter((task) => (task.kind ?? 'single') === 'batch').length,
      hasFilters: Boolean(normalizeSearchText(state.query)) || state.statusFilter !== 'all' || state.kindFilter !== 'all',
      hasMore: filteredTasks.length > visibleTasks.length
    }
  };
}
