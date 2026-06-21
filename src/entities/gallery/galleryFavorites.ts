import { normalizeGalleryPath } from '../../domain/galleryFilesystem';

export type GalleryFavoriteKind = 'task' | 'folder';

export interface GalleryFavoriteItem {
  itemKind: GalleryFavoriteKind;
  itemId: string;
  createdAt: number;
}

function normalizeFavoriteItem(value: unknown): GalleryFavoriteItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Partial<GalleryFavoriteItem>;
  const itemKind: GalleryFavoriteKind = item.itemKind === 'folder' ? 'folder' : 'task';
  const itemId = itemKind === 'folder' ? normalizeGalleryPath(item.itemId) : String(item.itemId ?? '').trim();
  if (!itemId || itemId === '/') return null;
  const createdAt = Number(item.createdAt ?? Date.now());
  return {
    itemKind,
    itemId,
    createdAt: Number.isFinite(createdAt) ? createdAt : Date.now()
  };
}

export function normalizeGalleryFavorites(value: unknown): GalleryFavoriteItem[] {
  if (!Array.isArray(value)) return [];
  const byKey = new Map<string, GalleryFavoriteItem>();
  for (const itemLike of value) {
    const item = normalizeFavoriteItem(itemLike);
    if (!item) continue;
    byKey.set(galleryFavoriteKey(item.itemKind, item.itemId), item);
  }
  return [...byKey.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export function galleryFavoriteKey(itemKind: GalleryFavoriteKind, itemId: string): string {
  return `${itemKind}:${itemKind === 'folder' ? normalizeGalleryPath(itemId) : itemId}`;
}

export function galleryFavoriteSet(favorites: GalleryFavoriteItem[]): Set<string> {
  return new Set(favorites.map((item) => galleryFavoriteKey(item.itemKind, item.itemId)));
}
