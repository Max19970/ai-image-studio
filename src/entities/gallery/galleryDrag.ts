export const galleryDragMime = 'application/x-image-studio-gallery-item';

export interface GalleryDragPayload {
  itemKind: 'task' | 'folder';
  itemId: string;
}

export function writeGalleryDragPayload(dataTransfer: DataTransfer, payload: GalleryDragPayload): void {
  dataTransfer.effectAllowed = 'move';
  dataTransfer.setData(galleryDragMime, JSON.stringify(payload));
  dataTransfer.setData('text/plain', payload.itemId);
}

export function hasGalleryDragPayload(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(galleryDragMime);
}

export function readGalleryDragPayload(dataTransfer: DataTransfer): GalleryDragPayload | null {
  try {
    const raw = dataTransfer.getData(galleryDragMime);
    if (!raw) return null;
    const value = JSON.parse(raw) as { itemKind?: unknown; itemId?: unknown };
    if ((value.itemKind !== 'task' && value.itemKind !== 'folder') || typeof value.itemId !== 'string' || !value.itemId) return null;
    return { itemKind: value.itemKind, itemId: value.itemId };
  } catch {
    return null;
  }
}
