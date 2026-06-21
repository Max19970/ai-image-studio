import type { GalleryFavoriteItem, GalleryFavoriteKind } from '../../entities/gallery/galleryFavorites';
import { normalizeGalleryFavorites } from '../../entities/gallery/galleryFavorites';
import { normalizeGalleryPath } from '../../domain/galleryFilesystem';

async function readJsonOrThrow(response: Response): Promise<unknown> {
  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }
  if (!response.ok) throw new Error(text || response.statusText);
  return data;
}

function readFavorites(data: unknown): GalleryFavoriteItem[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return normalizeGalleryFavorites((data as { favorites?: unknown }).favorites);
}

export async function loadRemoteGalleryFavorites(): Promise<GalleryFavoriteItem[]> {
  const data = await readJsonOrThrow(await fetch('/api/storage/gallery-favorites'));
  return readFavorites(data);
}

export async function setRemoteGalleryFavorite(args: { itemKind: GalleryFavoriteKind; itemId: string; favorite: boolean }): Promise<GalleryFavoriteItem[]> {
  const itemId = args.itemKind === 'folder' ? normalizeGalleryPath(args.itemId) : args.itemId;
  const data = await readJsonOrThrow(await fetch('/api/storage/gallery-items/favorite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemKind: args.itemKind, itemId, favorite: args.favorite })
  }));
  return readFavorites(data);
}
