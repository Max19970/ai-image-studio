import type { GenerationTask } from '../../../domain/generationTask';
import type { GalleryArchiveSummary, GalleryKindFilter, GallerySortMode, GalleryStatusFilter } from '../../../entities/gallery/archiveTypes';
import type { GalleryItem } from '../../../entities/gallery/galleryItems';

export interface GalleryArchiveState {
  query: string;
  statusFilter: GalleryStatusFilter;
  kindFilter: GalleryKindFilter;
  tagFilter: string;
  sort: GallerySortMode;
  visibleLimit: number;
}

export interface GalleryArchiveResult {
  tasks: GenerationTask[];
  items: GalleryItem[];
  filteredTasks: GenerationTask[];
  filteredItems: GalleryItem[];
  summary: GalleryArchiveSummary;
}
