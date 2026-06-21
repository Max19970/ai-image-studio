import {
  generationGalleryFavoriteBucket,
  loadEncryptedDocument,
  saveEncryptedDocument
} from './encryptedStore';
import { normalizeGalleryPath } from '../../src/domain/galleryFilesystem';

export type GalleryFavoriteKind = 'task' | 'folder';

export interface GalleryFavoriteItem {
  itemKind: GalleryFavoriteKind;
  itemId: string;
  createdAt: number;
}

const galleryFavoritesKey = 'items';

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
    byKey.set(`${item.itemKind}:${item.itemId}`, item);
  }
  return [...byKey.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export function loadGalleryFavorites(): GalleryFavoriteItem[] {
  return normalizeGalleryFavorites(loadEncryptedDocument(generationGalleryFavoriteBucket, galleryFavoritesKey, []));
}

function saveGalleryFavorites(favorites: GalleryFavoriteItem[]): GalleryFavoriteItem[] {
  const normalized = normalizeGalleryFavorites(favorites);
  saveEncryptedDocument(generationGalleryFavoriteBucket, galleryFavoritesKey, normalized);
  return normalized;
}

export function setGalleryItemFavorite(args: { itemKind: GalleryFavoriteKind; itemId: string; favorite: boolean }): GalleryFavoriteItem[] {
  const itemKind = args.itemKind === 'folder' ? 'folder' : 'task';
  const itemId = itemKind === 'folder' ? normalizeGalleryPath(args.itemId) : args.itemId.trim();
  if (!itemId || itemId === '/') throw new Error('Favorite item id is required.');
  const current = loadGalleryFavorites();
  const withoutItem = current.filter((item) => item.itemKind !== itemKind || item.itemId !== itemId);
  if (!args.favorite) return saveGalleryFavorites(withoutItem);
  return saveGalleryFavorites([...withoutItem, { itemKind, itemId, createdAt: Date.now() }]);
}

export function favoriteKey(itemKind: GalleryFavoriteKind, itemId: string): string {
  return `${itemKind}:${itemKind === 'folder' ? normalizeGalleryPath(itemId) : itemId}`;
}
