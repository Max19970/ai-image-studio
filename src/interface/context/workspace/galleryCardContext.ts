import type { GeneratedImage, GenerationTask } from '../../../domain/generationTask';
import type { GalleryFolderItem } from '../../../entities/gallery/galleryItems';

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
  onCancelTask: () => Promise<void>;
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
  onCancelTask: () => Promise<void>;
  onMoveTask: (targetPath: string) => void;
  pinned: boolean;
  tags: string[];
  onSetPinned: () => void;
  onSetTags: (tags: string[]) => void;
  onStartHiresFix: (image?: GeneratedImage | null) => Promise<void>;
}
