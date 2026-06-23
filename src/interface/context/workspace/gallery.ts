import type { GalleryFolder } from '../../../domain/galleryFilesystem';
import type { GenerationTask } from '../../../domain/generationTask';
import type { GalleryItem } from '../../../entities/gallery/galleryItems';
import type { GalleryCommands } from '../commands';
import type { GalleryArchiveControls } from './galleryArchiveContext';
import type { GallerySelectionContext } from './gallerySelectionContext';

export type { GalleryArchiveControls, GalleryHeaderActionContext } from './galleryArchiveContext';
export type { GalleryCardActionContext, GalleryFolderCardContext, GalleryTaskCardContext } from './galleryCardContext';
export type { GallerySelectionContext } from './gallerySelectionContext';

export interface WorkspaceGalleryContext {
  tasks: GenerationTask[];
  busy: boolean;
  commands: GalleryCommands;
}

export interface GalleryLayoutContext extends WorkspaceGalleryContext {
  allTasks: GenerationTask[];
  items: GalleryItem[];
  folders: GalleryFolder[];
  activePath: string;
  archive: GalleryArchiveControls;
  selection: GallerySelectionContext;
}
