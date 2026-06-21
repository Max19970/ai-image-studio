import { normalizeGalleryPath } from '../../domain/galleryFilesystem';

export type GalleryMetadataKind = 'task' | 'folder';

export interface GalleryPinItem {
  itemKind: GalleryMetadataKind;
  itemId: string;
  createdAt: number;
}

export interface GalleryTagRecord {
  itemKind: GalleryMetadataKind;
  itemId: string;
  tags: string[];
  updatedAt: number;
}

export function normalizeGalleryTag(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 40);
}

export function galleryMetadataId(itemKind: GalleryMetadataKind, itemId: string): string {
  return itemKind === 'folder' ? normalizeGalleryPath(itemId) : itemId.trim();
}

export function galleryMetadataKey(itemKind: GalleryMetadataKind, itemId: string): string {
  return `${itemKind}:${galleryMetadataId(itemKind, itemId)}`;
}

function normalizePinItem(value: unknown): GalleryPinItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Partial<GalleryPinItem>;
  const itemKind: GalleryMetadataKind = item.itemKind === 'folder' ? 'folder' : 'task';
  const itemId = galleryMetadataId(itemKind, String(item.itemId ?? ''));
  if (!itemId || itemId === '/') return null;
  const createdAt = Number(item.createdAt ?? Date.now());
  return { itemKind, itemId, createdAt: Number.isFinite(createdAt) ? createdAt : Date.now() };
}

export function normalizeGalleryPins(value: unknown): GalleryPinItem[] {
  if (!Array.isArray(value)) return [];
  const byKey = new Map<string, GalleryPinItem>();
  for (const itemLike of value) {
    const item = normalizePinItem(itemLike);
    if (!item) continue;
    byKey.set(galleryMetadataKey(item.itemKind, item.itemId), item);
  }
  return [...byKey.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export function galleryPinSet(pins: GalleryPinItem[]): Set<string> {
  return new Set(pins.map((item) => galleryMetadataKey(item.itemKind, item.itemId)));
}

function normalizeTagRecord(value: unknown): GalleryTagRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Partial<GalleryTagRecord>;
  const itemKind: GalleryMetadataKind = item.itemKind === 'folder' ? 'folder' : 'task';
  const itemId = galleryMetadataId(itemKind, String(item.itemId ?? ''));
  if (!itemId || itemId === '/') return null;
  const tags = Array.isArray(item.tags) ? [...new Set(item.tags.map(normalizeGalleryTag).filter(Boolean))].sort((a, b) => a.localeCompare(b)) : [];
  const updatedAt = Number(item.updatedAt ?? Date.now());
  return { itemKind, itemId, tags, updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now() };
}

export function normalizeGalleryTagRecords(value: unknown): GalleryTagRecord[] {
  if (!Array.isArray(value)) return [];
  const byKey = new Map<string, GalleryTagRecord>();
  for (const itemLike of value) {
    const item = normalizeTagRecord(itemLike);
    if (!item) continue;
    byKey.set(galleryMetadataKey(item.itemKind, item.itemId), item);
  }
  return [...byKey.values()].filter((item) => item.tags.length > 0).sort((a, b) => galleryMetadataKey(a.itemKind, a.itemId).localeCompare(galleryMetadataKey(b.itemKind, b.itemId)));
}

export function galleryTagMap(records: GalleryTagRecord[]): Map<string, string[]> {
  return new Map(records.map((item) => [galleryMetadataKey(item.itemKind, item.itemId), item.tags]));
}

export function galleryKnownTags(records: GalleryTagRecord[]): string[] {
  return [...new Set(records.flatMap((item) => item.tags))].sort((a, b) => a.localeCompare(b));
}
