import type { GenerationTask } from '../../../domain/generationTask';
import type { GalleryArchiveSummary, GalleryKindFilter, GallerySortMode, GalleryStatusFilter } from '../../../entities/gallery/archiveTypes';
import type { GalleryCommands } from '../commands';

export interface GalleryArchiveControls extends GalleryArchiveSummary {
  query: string;
  statusFilter: GalleryStatusFilter;
  kindFilter: GalleryKindFilter;
  tagFilter: string;
  sort: GallerySortMode;
  pageSize: number;
  setQuery: (query: string) => void;
  setStatusFilter: (filter: GalleryStatusFilter) => void;
  setKindFilter: (filter: GalleryKindFilter) => void;
  setTagFilter: (tag: string) => void;
  setSort: (sort: GallerySortMode) => void;
  showMore: () => void;
  reset: () => void;
  deleteFiltered: () => void;
}

export interface GalleryHeaderActionContext {
  tasks: GenerationTask[];
  busy: boolean;
  commands: GalleryCommands;
  archive: GalleryArchiveControls;
}
