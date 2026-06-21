import type { GalleryMetadataKind, GalleryPinItem, GalleryTagRecord } from '../../entities/gallery/galleryMetadata';
import { galleryMetadataId, normalizeGalleryPins, normalizeGalleryTagRecords } from '../../entities/gallery/galleryMetadata';

async function readJsonOrThrow(response: Response): Promise<unknown> {
  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text
  }
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data
      ? String((data as { error?: unknown }).error)
      : text || response.statusText;
    throw new Error(message);
  }
  return data;
}

function readPins(data: unknown): GalleryPinItem[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return normalizeGalleryPins((data as { pins?: unknown }).pins);
}

function readTagRecords(data: unknown): GalleryTagRecord[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return normalizeGalleryTagRecords((data as { tags?: unknown }).tags);
}

export async function loadRemoteGalleryPins(): Promise<GalleryPinItem[]> {
  const data = await readJsonOrThrow(await fetch('/api/storage/gallery-pins'));
  return readPins(data);
}

export async function setRemoteGalleryPin(args: { itemKind: GalleryMetadataKind; itemId: string; pinned: boolean }): Promise<GalleryPinItem[]> {
  const data = await readJsonOrThrow(await fetch('/api/storage/gallery-items/pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemKind: args.itemKind, itemId: galleryMetadataId(args.itemKind, args.itemId), pinned: args.pinned })
  }));
  return readPins(data);
}

export async function loadRemoteGalleryTagRecords(): Promise<GalleryTagRecord[]> {
  const data = await readJsonOrThrow(await fetch('/api/storage/gallery-tags'));
  return readTagRecords(data);
}

export async function setRemoteGalleryTags(args: { itemKind: GalleryMetadataKind; itemId: string; tags: string[] }): Promise<GalleryTagRecord[]> {
  const data = await readJsonOrThrow(await fetch('/api/storage/gallery-items/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemKind: args.itemKind, itemId: galleryMetadataId(args.itemKind, args.itemId), tags: args.tags })
  }));
  return readTagRecords(data);
}
