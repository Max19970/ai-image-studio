import type { GenerationStatus, GenerationTask } from '../../../domain/generationTask';
import type { GalleryKindFilter, GallerySortMode, GalleryStatusFilter } from '../../../entities/gallery/archiveTypes';
import type { GalleryItem } from '../../../entities/gallery/galleryItems';
import type { GalleryArchiveState } from './galleryArchiveTypes';

export const galleryArchiveActiveStatuses = new Set<GenerationStatus>(['created', 'queued', 'sending', 'running', 'retrying']);
const terminalStatuses = new Set<GenerationStatus>(['succeeded', 'failed', 'cancelled']);

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
    task.galleryPath ?? '/',
    task.request.prompt,
    task.request.providerLabel,
    task.request.model,
    task.request.modelLabel,
    task.error ?? '',
    ...(task.batch?.items.map((item) => item.request.prompt) ?? [])
  ].join('\n').toLowerCase();
  return haystack.includes(normalized);
}

function itemMatchesQuery(item: GalleryItem, query: string): boolean {
  const normalized = normalizeSearchText(query);
  if (!normalized) return true;
  if (item.kind === 'folder') return [item.name, item.path, ...item.tags].join('\n').toLowerCase().includes(normalized);
  return taskMatchesQuery(item.task, query) || item.tags.join('\n').toLowerCase().includes(normalized);
}

function taskMatchesStatus(task: GenerationTask, filter: GalleryStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return galleryArchiveActiveStatuses.has(task.status);
  if (filter === 'terminal') return terminalStatuses.has(task.status);
  return task.status === filter;
}

function itemMatchesStatus(item: GalleryItem, filter: GalleryStatusFilter): boolean {
  if (item.kind === 'folder') return filter === 'all';
  return taskMatchesStatus(item.task, filter);
}

function taskMatchesKind(task: GenerationTask, filter: GalleryKindFilter): boolean {
  if (filter === 'all') return true;
  return (task.kind ?? 'single') === filter;
}

function itemMatchesKind(item: GalleryItem, filter: GalleryKindFilter): boolean {
  if (item.kind === 'folder') return filter === 'all';
  return taskMatchesKind(item.task, filter);
}

function itemMatchesTag(item: GalleryItem, tagFilter: string): boolean {
  if (!tagFilter) return true;
  return item.tags.includes(tagFilter);
}

export function itemMatchesFilters(item: GalleryItem, state: GalleryArchiveState): boolean {
  return itemMatchesQuery(item, state.query)
    && itemMatchesStatus(item, state.statusFilter)
    && itemMatchesKind(item, state.kindFilter)
    && itemMatchesTag(item, state.tagFilter);
}

export function galleryItemImageCount(item: GalleryItem): number {
  return item.kind === 'task' ? galleryTaskImageCount(item.task) : 0;
}

function compareTasks(a: GenerationTask, b: GenerationTask, sort: GallerySortMode): number {
  if (sort === 'oldest') return a.createdAt - b.createdAt;
  if (sort === 'updated') return b.updatedAt - a.updatedAt;
  if (sort === 'images') return galleryTaskImageCount(b) - galleryTaskImageCount(a) || b.createdAt - a.createdAt;
  return b.createdAt - a.createdAt;
}

export function compareItems(a: GalleryItem, b: GalleryItem, sort: GallerySortMode): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  if (a.kind === 'folder' && b.kind !== 'folder') return -1;
  if (a.kind !== 'folder' && b.kind === 'folder') return 1;
  if (a.kind === 'folder' && b.kind === 'folder') return a.name.localeCompare(b.name);
  if (a.kind === 'task' && b.kind === 'task') return compareTasks(a.task, b.task, sort);
  return 0;
}

export function hasGalleryArchiveFilters(state: GalleryArchiveState): boolean {
  return Boolean(normalizeSearchText(state.query))
    || state.statusFilter !== 'all'
    || state.kindFilter !== 'all'
    || Boolean(state.tagFilter);
}
