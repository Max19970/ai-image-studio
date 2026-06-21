import type { GalleryFolder } from '../../../domain/galleryFilesystem';
import type { GeneratedImage, GenerationTask } from '../../../domain/generationTask';
import type { GalleryClipboardItemPayload, GalleryClipboardOperation, GalleryClipboardState } from '../../../entities/gallery/galleryClipboard';
import type { GalleryFolderItem, GalleryItem } from '../../../entities/gallery/galleryItems';
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

export interface GalleryFolderCardContext {
  folder: GalleryFolderItem;
  index: number;
  onOpenFolder: () => void;
  onDeleteFolder: () => void;
  onMoveFolder: (targetPath: string) => void;
  onSetPinned: () => void;
  onSetTags: (tags: string[]) => void;
}

export interface GalleryCardActionContext {
  task: GenerationTask;
  activeImage: GeneratedImage | null;
  galleryIndex: number;
  onOpenTask: (image?: GeneratedImage) => void;
  onDeleteTask: () => void;
  onMoveTask: (targetPath: string) => void;
  pinned: boolean;
  tags: string[];
  onSetPinned: () => void;
  onSetTags: (tags: string[]) => void;
  onStartHiresFix: () => Promise<void>;
}

export interface GalleryTaskCardContext {
  task: GenerationTask;
  index: number;
  onOpenTask: (image?: GeneratedImage) => void;
  onDeleteTask: () => void;
  onMoveTask: (targetPath: string) => void;
  pinned: boolean;
  tags: string[];
  onSetPinned: () => void;
  onSetTags: (tags: string[]) => void;
  onStartHiresFix: (image?: GeneratedImage | null) => Promise<void>;
}

export interface WorkspaceGalleryContext {
  tasks: GenerationTask[];
  busy: boolean;
  commands: GalleryCommands;
}

export interface GallerySelectionContext {
  mode: boolean;
  selectedIds: Set<string>;
  selectedItems: GalleryClipboardItemPayload[];
  clipboard: GalleryClipboardState | null;
  begin: () => void;
  cancel: () => void;
  toggleItem: (item: GalleryItem) => void;
  isSelected: (item: GalleryItem) => boolean;
  copyToClipboard: (operation: GalleryClipboardOperation) => void;
  pasteToActivePath: () => Promise<void>;
  deleteSelected: () => void;
}

export interface GalleryLayoutContext extends WorkspaceGalleryContext {
  allTasks: GenerationTask[];
  items: GalleryItem[];
  folders: GalleryFolder[];
  activePath: string;
  archive: GalleryArchiveControls;
  selection: GallerySelectionContext;
}
