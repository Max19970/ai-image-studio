import type { GalleryClipboardItemPayload, GalleryClipboardOperation, GalleryClipboardState } from '../../../entities/gallery/galleryClipboard';
import type { GalleryItem } from '../../../entities/gallery/galleryItems';

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
