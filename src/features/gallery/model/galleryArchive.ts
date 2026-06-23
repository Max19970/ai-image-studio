import type { GalleryFolder } from '../../../domain/galleryFilesystem';
import { normalizeGalleryPath } from '../../../domain/galleryFilesystem';
import type { GalleryPinItem, GalleryTagRecord } from '../../../entities/gallery/galleryMetadata';
import { galleryKnownTags, galleryPinSet, galleryTagMap } from '../../../entities/gallery/galleryMetadata';
import type { GenerationTask } from '../../../domain/generationTask';
import type { GalleryArchiveSummary } from '../../../entities/gallery/archiveTypes';
import type { GalleryItem } from '../../../entities/gallery/galleryItems';
import { resolveGalleryItems } from '../../../entities/gallery/galleryItems';
import type { GalleryArchiveResult, GalleryArchiveState } from './galleryArchiveTypes';
import {
  compareItems,
  galleryArchiveActiveStatuses,
  galleryItemImageCount,
  hasGalleryArchiveFilters,
  itemMatchesFilters
} from './galleryArchiveFilters';
export { galleryTaskImageCount } from './galleryArchiveFilters';

export const galleryArchivePageSize = 48;
export type { GalleryArchiveResult, GalleryArchiveState } from './galleryArchiveTypes';

interface GalleryArchiveOptions {
  folders?: GalleryFolder[];
  pins?: GalleryPinItem[];
  tags?: GalleryTagRecord[];
  activePath?: string;
}

export function resolveGalleryArchive(
  tasks: GenerationTask[],
  state: GalleryArchiveState,
  options: GalleryArchiveOptions = {}
): GalleryArchiveResult {
  const activePath = normalizeGalleryPath(options.activePath);
  const allItems = resolveGalleryItems({
    folders: options.folders ?? [],
    tasks,
    activePath,
    pinKeys: galleryPinSet(options.pins ?? []),
    tagMap: galleryTagMap(options.tags ?? [])
  });

  const pinnedItems = allItems.filter((item) => item.pinned);
  const filteredRegularItems = allItems.filter((item) => !item.pinned).filter((item) => itemMatchesFilters(item, state));
  const filteredItems = [...pinnedItems, ...filteredRegularItems].sort((a, b) => compareItems(a, b, state.sort));
  const visibleItems = filteredItems.slice(0, Math.max(1, state.visibleLimit));
  const filteredTasks = filteredItems.flatMap((item) => item.kind === 'task' ? [item.task] : []);
  const visibleTasks = visibleItems.flatMap((item) => item.kind === 'task' ? [item.task] : []);
  const pathTasks = allItems.flatMap((item) => item.kind === 'task' ? [item.task] : []);

  return {
    tasks: visibleTasks,
    items: visibleItems,
    filteredTasks,
    filteredItems,
    summary: resolveGalleryArchiveSummary({ allItems, filteredItems, filteredTasks, visibleItems, pathTasks, state, tags: options.tags })
  };
}

function resolveGalleryArchiveSummary(input: {
  allItems: GalleryItem[];
  filteredItems: GalleryItem[];
  filteredTasks: GenerationTask[];
  visibleItems: GalleryItem[];
  pathTasks: GenerationTask[];
  state: GalleryArchiveState;
  tags?: GalleryTagRecord[];
}): GalleryArchiveSummary {
  return {
    totalCount: input.allItems.length,
    filteredCount: input.filteredItems.length,
    filteredTaskCount: input.filteredTasks.length,
    visibleCount: input.visibleItems.length,
    totalImages: input.allItems.reduce((total, item) => total + galleryItemImageCount(item), 0),
    filteredImages: input.filteredItems.reduce((total, item) => total + galleryItemImageCount(item), 0),
    activeCount: input.pathTasks.filter((task) => galleryArchiveActiveStatuses.has(task.status)).length,
    batchCount: input.pathTasks.filter((task) => (task.kind ?? 'single') === 'batch').length,
    hasFilters: hasGalleryArchiveFilters(input.state),
    availableTags: galleryKnownTags(input.tags ?? []),
    hasMore: input.filteredItems.length > input.visibleItems.length
  };
}
