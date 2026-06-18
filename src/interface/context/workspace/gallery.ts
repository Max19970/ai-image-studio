import type { GeneratedImage, GenerationTask } from '../../../domain/generationTask';
import type { GalleryArchiveSummary, GalleryKindFilter, GallerySortMode, GalleryStatusFilter } from '../../../entities/gallery/archiveTypes';
import type { GalleryCommands } from '../commands';

export interface GalleryArchiveControls extends GalleryArchiveSummary {
  query: string;
  statusFilter: GalleryStatusFilter;
  kindFilter: GalleryKindFilter;
  sort: GallerySortMode;
  pageSize: number;
  setQuery: (query: string) => void;
  setStatusFilter: (filter: GalleryStatusFilter) => void;
  setKindFilter: (filter: GalleryKindFilter) => void;
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

export interface GalleryCardActionContext {
  task: GenerationTask;
  activeImage: GeneratedImage | null;
  galleryIndex: number;
  onDeleteTask: () => void;
}

export interface GalleryTaskCardContext {
  task: GenerationTask;
  index: number;
  onOpenTask: (image?: GeneratedImage) => void;
  onDeleteTask: () => void;
}

export interface WorkspaceGalleryContext {
  tasks: GenerationTask[];
  busy: boolean;
  commands: GalleryCommands;
}

export interface GalleryLayoutContext extends WorkspaceGalleryContext {
  archive: GalleryArchiveControls;
}
