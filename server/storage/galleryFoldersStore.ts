import {
  deleteEncryptedDocument,
  generationGalleryFolderBucket,
  loadEncryptedDocument,
  saveEncryptedDocument
} from './encryptedStore';
import {
  createGalleryFolderDraft,
  getGalleryParentPath,
  getGalleryPathName,
  isGalleryPathInside,
  joinGalleryPath,
  mapGallerySubPath,
  normalizeGalleryFolder,
  normalizeGalleryFolders,
  normalizeGalleryPath,
  type GalleryFolder
} from '../../src/domain/galleryFilesystem';

const galleryFoldersKey = 'folders';

export type GalleryPasteOperation = 'move' | 'link-copy' | 'deep-copy';

export interface GalleryPasteItem {
  itemKind: 'task' | 'folder';
  itemId: string;
  sourcePath: string;
}

export interface GalleryFolderPasteMapping {
  itemKind: 'folder';
  itemId: string;
  sourcePath: string;
  nextPath: string;
}

export function loadGalleryFolders(): GalleryFolder[] {
  return normalizeGalleryFolders(loadEncryptedDocument(generationGalleryFolderBucket, galleryFoldersKey, []));
}

function saveGalleryFolders(folders: GalleryFolder[]): GalleryFolder[] {
  const normalized = normalizeGalleryFolders(folders);
  saveEncryptedDocument(generationGalleryFolderBucket, galleryFoldersKey, normalized);
  return normalized;
}

function uniqueFolderPath(existing: Set<string>, parentPath: string, name: string): string {
  const base = joinGalleryPath(parentPath, name);
  if (!existing.has(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = joinGalleryPath(parentPath, `${name} ${index}`);
    if (!existing.has(candidate)) return candidate;
  }
  return joinGalleryPath(parentPath, `${name} ${Date.now()}`);
}

export function createGalleryFolder(parentPath: string, name: string): GalleryFolder {
  const folder = createGalleryFolderDraft(parentPath, name);
  if (!folder) throw new Error('Folder name is required.');
  const folders = loadGalleryFolders();
  if (folders.some((item) => item.path === folder.path)) throw new Error('A folder with this name already exists here.');
  saveGalleryFolders([...folders, folder]);
  return folder;
}

export function deleteGalleryFolder(path: string): GalleryFolder[] {
  const normalizedPath = normalizeGalleryPath(path);
  if (normalizedPath === '/') throw new Error('Root folder cannot be deleted.');
  const folders = loadGalleryFolders();
  return saveGalleryFolders(folders.filter((folder) => folder.path !== normalizedPath && !isGalleryPathInside(folder.path, normalizedPath)));
}

export function moveGalleryItemPath(args: { itemKind: 'task' | 'folder'; itemId: string; targetPath: string }): { folders: GalleryFolder[]; sourcePath?: string; nextPath?: string } {
  const result = pasteGalleryFolderItems({
    operation: 'move',
    targetPath: args.targetPath,
    items: [{ itemKind: args.itemKind, itemId: args.itemId, sourcePath: args.itemKind === 'folder' ? args.itemId : '/' }]
  });
  const first = result.mappings[0];
  return { folders: result.folders, sourcePath: first?.sourcePath, nextPath: first?.nextPath ?? normalizeGalleryPath(args.targetPath) };
}

export function pasteGalleryFolderItems(args: {
  operation: GalleryPasteOperation;
  targetPath: string;
  items: GalleryPasteItem[];
}): { folders: GalleryFolder[]; mappings: GalleryFolderPasteMapping[] } {
  const targetPath = normalizeGalleryPath(args.targetPath);
  const folders = loadGalleryFolders();
  const byPath = new Map(folders.map((folder) => [folder.path, folder]));
  const occupied = new Set(byPath.keys());
  const mappings: GalleryFolderPasteMapping[] = [];
  const now = Date.now();

  for (const item of args.items) {
    if (item.itemKind !== 'folder') continue;
    const sourcePath = normalizeGalleryPath(item.itemId || item.sourcePath);
    if (sourcePath === '/') throw new Error('Root folder cannot be pasted.');
    if (args.operation === 'move' && (targetPath === sourcePath || isGalleryPathInside(targetPath, sourcePath))) throw new Error('A folder cannot be moved into itself.');
    const sourceFolder = byPath.get(sourcePath);
    if (!sourceFolder) continue;
    const nextPath = uniqueFolderPath(occupied, targetPath, getGalleryPathName(sourcePath));
    mappings.push({ itemKind: 'folder', itemId: sourcePath, sourcePath, nextPath });

    const sourceTree = folders.filter((folder) => folder.path === sourcePath || isGalleryPathInside(folder.path, sourcePath));
    if (args.operation === 'move') {
      for (const folder of sourceTree) byPath.delete(folder.path);
    }
    for (const folder of sourceTree) {
      const path = mapGallerySubPath(folder.path, sourcePath, nextPath);
      occupied.add(path);
      const normalized = normalizeGalleryFolder({
        ...folder,
        id: path,
        path,
        name: getGalleryPathName(path),
        createdAt: args.operation === 'move' ? folder.createdAt : now,
        updatedAt: now
      });
      if (normalized) byPath.set(path, normalized);
    }
  }

  return { folders: saveGalleryFolders([...byPath.values()]), mappings };
}

export function clearGalleryFolders() {
  deleteEncryptedDocument(generationGalleryFolderBucket, galleryFoldersKey);
}

export function ensureGalleryFolderAncestors(path: string): GalleryFolder[] {
  const normalizedPath = normalizeGalleryPath(path);
  if (normalizedPath === '/') return loadGalleryFolders();
  const existing = loadGalleryFolders();
  const byPath = new Map(existing.map((folder) => [folder.path, folder]));
  let cursor = '/';
  const now = Date.now();
  for (const segment of normalizedPath.split('/').filter(Boolean)) {
    cursor = normalizeGalleryPath(cursor === '/' ? `/${segment}` : `${cursor}/${segment}`);
    if (!byPath.has(cursor)) {
      byPath.set(cursor, {
        id: cursor,
        path: cursor,
        name: segment,
        createdAt: now,
        updatedAt: now
      });
    }
  }
  return saveGalleryFolders([...byPath.values()]);
}

export function getGalleryParent(path: string): string {
  return getGalleryParentPath(path);
}
