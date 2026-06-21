export type GalleryClipboardOperation = 'move' | 'link-copy' | 'deep-copy';

export interface GalleryClipboardItemPayload {
  itemKind: 'task' | 'folder';
  itemId: string;
  sourcePath: string;
}

export interface GalleryClipboardState {
  operation: GalleryClipboardOperation;
  items: GalleryClipboardItemPayload[];
}
