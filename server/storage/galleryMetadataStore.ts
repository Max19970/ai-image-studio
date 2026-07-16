import { isGalleryItemKind } from '../gallery/descriptors';
import { generationGalleryPinBucket, generationGalleryTagBucket, loadEncryptedDocument, saveEncryptedDocument } from './encryptedStore';
import { isGalleryPathInside, mapGallerySubPath, normalizeGalleryPath } from '../../src/domain/galleryFilesystem';
import {
  galleryMetadataId,
  galleryMetadataKey,
  normalizeGalleryPins,
  normalizeGalleryTag,
  normalizeGalleryTagRecords,
  type GalleryMetadataKind,
  type GalleryPinItem,
  type GalleryTagRecord
} from '../../src/entities/gallery/galleryMetadata';

const galleryPinsKey = 'items';
const galleryTagsKey = 'items';

export function loadGalleryPins(): GalleryPinItem[] {
  return normalizeGalleryPins(loadEncryptedDocument(generationGalleryPinBucket, galleryPinsKey, []));
}

function saveGalleryPins(items: GalleryPinItem[]): GalleryPinItem[] {
  const normalized = normalizeGalleryPins(items);
  saveEncryptedDocument(generationGalleryPinBucket, galleryPinsKey, normalized);
  return normalized;
}

function normalizeGalleryMetadataKind(value: unknown): GalleryMetadataKind {
  return isGalleryItemKind(value) ? value : 'task';
}

export function setGalleryItemPinned(args: { itemKind: GalleryMetadataKind; itemId: string; pinned: boolean }): GalleryPinItem[] {
  const itemKind = normalizeGalleryMetadataKind(args.itemKind);
  const itemId = galleryMetadataId(itemKind, args.itemId);
  if (!itemId || itemId === '/') throw new Error('Pinned item id is required.');
  const current = loadGalleryPins();
  const withoutItem = current.filter((item) => galleryMetadataKey(item.itemKind, item.itemId) !== galleryMetadataKey(itemKind, itemId));
  if (!args.pinned) return saveGalleryPins(withoutItem);
  return saveGalleryPins([...withoutItem, { itemKind, itemId, createdAt: Date.now() }]);
}

export function loadGalleryTagRecords(): GalleryTagRecord[] {
  return normalizeGalleryTagRecords(loadEncryptedDocument(generationGalleryTagBucket, galleryTagsKey, []));
}

function saveGalleryTagRecords(items: GalleryTagRecord[]): GalleryTagRecord[] {
  const normalized = normalizeGalleryTagRecords(items);
  saveEncryptedDocument(generationGalleryTagBucket, galleryTagsKey, normalized);
  return normalized;
}

export function setGalleryItemTags(args: { itemKind: GalleryMetadataKind; itemId: string; tags: string[] }): GalleryTagRecord[] {
  const itemKind = normalizeGalleryMetadataKind(args.itemKind);
  const itemId = galleryMetadataId(itemKind, args.itemId);
  if (!itemId || itemId === '/') throw new Error('Tagged item id is required.');
  const tags = [...new Set(args.tags.map(normalizeGalleryTag).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const key = galleryMetadataKey(itemKind, itemId);
  const records = loadGalleryTagRecords().filter((item) => galleryMetadataKey(item.itemKind, item.itemId) !== key);
  if (tags.length === 0) return saveGalleryTagRecords(records);
  return saveGalleryTagRecords([...records, { itemKind, itemId, tags, updatedAt: Date.now() }]);
}

export function remapGalleryFolderMetadata(sourcePath: string, nextPath: string): void {
  const source = normalizeGalleryPath(sourcePath);
  const target = normalizeGalleryPath(nextPath);
  if (source === target) return;
  const mapFolderId = (itemId: string) => (
    itemId === source || isGalleryPathInside(itemId, source) ? mapGallerySubPath(itemId, source, target) : itemId
  );
  saveGalleryPins(loadGalleryPins().map((item) => item.itemKind === 'folder' ? { ...item, itemId: mapFolderId(item.itemId) } : item));
  saveGalleryTagRecords(loadGalleryTagRecords().map((item) => item.itemKind === 'folder'
    ? { ...item, itemId: mapFolderId(item.itemId), updatedAt: Date.now() }
    : item));
}
