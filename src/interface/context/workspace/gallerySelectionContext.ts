import type { GalleryClipboardItemPayload, GalleryClipboardOperation, GalleryClipboardState } from '../../../entities/gallery/galleryClipboard';
import type { GalleryItem } from '../../../entities/gallery/galleryItems';

export interface GallerySelectionContext {
  mode: boolean;
  selectedIds: Set<string>;
  selectedItems: GalleryClipboardItemPayload[];
  selectedTaskIds: string[];
  clipboard: GalleryClipboardState | null;
  begin: () => void;
  cancel: () => void;
  selectVisible: () => void;
  clearSelection: () => void;
  toggleItem: (item: GalleryItem, options?: { range?: boolean }) => void;
  isSelected: (item: GalleryItem) => boolean;
  copyToClipboard: (operation: GalleryClipboardOperation) => void;
  clearClipboard: () => void;
  pasteToActivePath: () => Promise<void>;
  downloadSelected: () => Promise<void>;
  deleteSelected: () => void;
}
