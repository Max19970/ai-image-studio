import type { GalleryFolder } from '../../domain/galleryFilesystem';
import { normalizeGalleryFolders, normalizeGalleryPath } from '../../domain/galleryFilesystem';
import type { GalleryClipboardItemPayload, GalleryClipboardOperation } from '../../entities/gallery/galleryClipboard';

const galleryFoldersEndpoint = '/api/storage/gallery-folders';
const galleryItemsMoveEndpoint = '/api/storage/gallery-items/move';
const galleryItemsPasteEndpoint = '/api/storage/gallery-items/paste';

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

function readFolders(data: unknown): GalleryFolder[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return normalizeGalleryFolders((data as { folders?: unknown }).folders);
}

export async function loadRemoteGalleryFolders(): Promise<GalleryFolder[]> {
  const data = await readJsonOrThrow(await fetch(galleryFoldersEndpoint));
  return readFolders(data);
}

export async function createRemoteGalleryFolder(parentPath: string, name: string): Promise<GalleryFolder[]> {
  const data = await readJsonOrThrow(await fetch(galleryFoldersEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentPath: normalizeGalleryPath(parentPath), name })
  }));
  return readFolders(data);
}

export async function renameRemoteGalleryFolder(path: string, name: string): Promise<{ folders: GalleryFolder[]; sourcePath: string; nextPath: string }> {
  const data = await readJsonOrThrow(await fetch(galleryFoldersEndpoint, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: normalizeGalleryPath(path), name })
  }));
  const object = data && typeof data === 'object' && !Array.isArray(data) ? data as { sourcePath?: unknown; nextPath?: unknown } : {};
  return {
    folders: readFolders(data),
    sourcePath: normalizeGalleryPath(object.sourcePath),
    nextPath: normalizeGalleryPath(object.nextPath)
  };
}

export async function deleteRemoteGalleryFolder(path: string): Promise<GalleryFolder[]> {
  const params = new URLSearchParams({ path: normalizeGalleryPath(path) });
  const data = await readJsonOrThrow(await fetch(`${galleryFoldersEndpoint}?${params}`, { method: 'DELETE' }));
  return readFolders(data);
}

export async function moveRemoteGalleryItem(args: { itemKind: 'task' | 'folder'; itemId: string; targetPath: string }): Promise<GalleryFolder[]> {
  const data = await readJsonOrThrow(await fetch(galleryItemsMoveEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemKind: args.itemKind,
      itemId: args.itemId,
      targetPath: normalizeGalleryPath(args.targetPath)
    })
  }));
  return readFolders(data);
}

export async function pasteRemoteGalleryItems(args: {
  operation: GalleryClipboardOperation;
  targetPath: string;
  items: GalleryClipboardItemPayload[];
}): Promise<GalleryFolder[]> {
  const data = await readJsonOrThrow(await fetch(galleryItemsPasteEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: args.operation,
      targetPath: normalizeGalleryPath(args.targetPath),
      items: args.items.map((item) => ({ ...item, sourcePath: normalizeGalleryPath(item.sourcePath) }))
    })
  }));
  return readFolders(data);
}
