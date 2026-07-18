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
import {
  galleryItemCanContainChildren,
  type GalleryItemKind,
  type GalleryPasteOperation
} from './descriptors';
export interface GalleryCatalogMetadataCopyMapping {
  itemKind: GalleryMetadataKind;
  sourceItemId: string;
  nextItemId: string;
}

export interface GalleryFolderPasteItem {
  itemKind: GalleryItemKind;
  itemId: string;
  sourcePath: string;
}

export interface GalleryFolderPasteMapping {
  itemKind: 'folder';
  itemId: string;
  sourcePath: string;
  nextPath: string;
}

export interface GalleryCatalogDocumentsState {
  folders: GalleryFolder[];
  pins: GalleryPinItem[];
  tags: GalleryTagRecord[];
}

function uniqueFolderPath(existing: Set<string>, parentPath: string, name: string, now: number): string {
  const base = joinGalleryPath(parentPath, name);
  if (!existing.has(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = joinGalleryPath(parentPath, `${name} ${index}`);
    if (!existing.has(candidate)) return candidate;
  }
  return joinGalleryPath(parentPath, `${name} ${now}`);
}

function ensureAncestors(folders: GalleryFolder[], path: string, now: number): GalleryFolder[] {
  const byPath = new Map(normalizeGalleryFolders(folders).map((folder) => [folder.path, folder]));
  let cursor = '/';
  for (const segment of normalizeGalleryPath(path).split('/').filter(Boolean)) {
    cursor = normalizeGalleryPath(cursor === '/' ? `/${segment}` : `${cursor}/${segment}`);
    if (!byPath.has(cursor)) {
      byPath.set(cursor, { id: cursor, path: cursor, name: segment, createdAt: now, updatedAt: now });
    }
  }
  return normalizeGalleryFolders([...byPath.values()]);
}

export function createGalleryFolderState(
  folders: GalleryFolder[],
  parentPath: string,
  name: string,
  now = Date.now()
): { folder: GalleryFolder; folders: GalleryFolder[] } {
  const folder = createGalleryFolderDraft(parentPath, name, now);
  if (!folder) throw new Error('Folder name is required.');
  const normalized = normalizeGalleryFolders(folders);
  if (normalized.some((item) => item.path === folder.path)) throw new Error('A folder with this name already exists here.');
  return { folder, folders: ensureAncestors([...normalized, folder], folder.path, now) };
}

export function renameGalleryFolderState(
  folders: GalleryFolder[],
  path: string,
  name: string,
  now = Date.now()
): { folders: GalleryFolder[]; sourcePath: string; nextPath: string } {
  const sourcePath = normalizeGalleryPath(path);
  if (sourcePath === '/') throw new Error('Root folder cannot be renamed.');
  const draft = createGalleryFolderDraft(getGalleryParentPath(sourcePath), name, now);
  if (!draft) throw new Error('Folder name is required.');
  const nextPath = draft.path;
  const normalized = normalizeGalleryFolders(folders);
  if (!normalized.some((folder) => folder.path === sourcePath)) throw new Error('Folder was not found.');
  if (nextPath !== sourcePath && normalized.some((folder) => folder.path === nextPath)) {
    throw new Error('A folder with this name already exists here.');
  }
  if (nextPath === sourcePath) return { folders: normalized, sourcePath, nextPath };
  return {
    sourcePath,
    nextPath,
    folders: normalizeGalleryFolders(normalized.map((folder) => {
      if (folder.path !== sourcePath && !isGalleryPathInside(folder.path, sourcePath)) return folder;
      const mappedPath = mapGallerySubPath(folder.path, sourcePath, nextPath);
      return normalizeGalleryFolder({
        ...folder,
        id: mappedPath,
        path: mappedPath,
        name: getGalleryPathName(mappedPath),
        updatedAt: now
      }) ?? folder;
    }))
  };
}

export function deleteGalleryFolderState(folders: GalleryFolder[], path: string): GalleryFolder[] {
  const source = normalizeGalleryPath(path);
  if (source === '/') throw new Error('Root folder cannot be deleted.');
  return normalizeGalleryFolders(folders).filter((folder) => folder.path !== source && !isGalleryPathInside(folder.path, source));
}

export function pasteGalleryFolderState(args: {
  folders: GalleryFolder[];
  operation: GalleryPasteOperation;
  targetPath: string;
  items: GalleryFolderPasteItem[];
  now?: number;
}): { folders: GalleryFolder[]; mappings: GalleryFolderPasteMapping[] } {
  const now = args.now ?? Date.now();
  const target = normalizeGalleryPath(args.targetPath);
  const folders = normalizeGalleryFolders(args.folders);
  const byPath = new Map(folders.map((folder) => [folder.path, folder]));
  const occupied = new Set(byPath.keys());
  const mappings: GalleryFolderPasteMapping[] = [];

  for (const item of args.items) {
    if (!galleryItemCanContainChildren(item.itemKind)) continue;
    const sourcePath = normalizeGalleryPath(item.itemId || item.sourcePath);
    if (sourcePath === '/') throw new Error('Root folder cannot be pasted.');
    if (args.operation === 'move' && (target === sourcePath || isGalleryPathInside(target, sourcePath))) {
      throw new Error('A folder cannot be moved into itself.');
    }
    const sourceFolder = byPath.get(sourcePath);
    if (!sourceFolder) continue;
    const nextPath = uniqueFolderPath(occupied, target, getGalleryPathName(sourcePath), now);
    mappings.push({ itemKind: 'folder', itemId: sourcePath, sourcePath, nextPath });
    const sourceTree = folders.filter((folder) => folder.path === sourcePath || isGalleryPathInside(folder.path, sourcePath));
    if (args.operation === 'move') {
      for (const folder of sourceTree) byPath.delete(folder.path);
    }
    for (const folder of sourceTree) {
      const mappedPath = mapGallerySubPath(folder.path, sourcePath, nextPath);
      occupied.add(mappedPath);
      const mapped = normalizeGalleryFolder({
        ...folder,
        id: mappedPath,
        path: mappedPath,
        name: getGalleryPathName(mappedPath),
        createdAt: args.operation === 'move' ? folder.createdAt : now,
        updatedAt: now
      });
      if (mapped) byPath.set(mappedPath, mapped);
    }
  }

  return { folders: normalizeGalleryFolders([...byPath.values()]), mappings };
}

export function moveGalleryFolderItemState(args: {
  folders: GalleryFolder[];
  itemKind: GalleryItemKind;
  itemId: string;
  targetPath: string;
}): { folders: GalleryFolder[]; sourcePath?: string; nextPath?: string } {
  const result = pasteGalleryFolderState({
    folders: args.folders,
    operation: 'move',
    targetPath: args.targetPath,
    items: [{ itemKind: args.itemKind, itemId: args.itemId, sourcePath: args.itemKind === 'folder' ? args.itemId : '/' }]
  });
  const first = result.mappings[0];
  return { folders: result.folders, sourcePath: first?.sourcePath, nextPath: first?.nextPath ?? normalizeGalleryPath(args.targetPath) };
}

function metadataCopyId(mapping: GalleryCatalogMetadataCopyMapping, kind: GalleryMetadataKind, id: string): string | null {
  if (mapping.itemKind !== kind) return null;
  if (kind === 'task') return id === mapping.sourceItemId ? mapping.nextItemId : null;
  const source = normalizeGalleryPath(mapping.sourceItemId);
  if (id !== source && !isGalleryPathInside(id, source)) return null;
  return mapGallerySubPath(id, source, normalizeGalleryPath(mapping.nextItemId));
}

export function remapGalleryFolderMetadataState(
  state: Pick<GalleryCatalogDocumentsState, 'pins' | 'tags'>,
  sourcePath: string,
  nextPath: string,
  now = Date.now()
): Pick<GalleryCatalogDocumentsState, 'pins' | 'tags'> {
  const source = normalizeGalleryPath(sourcePath);
  const target = normalizeGalleryPath(nextPath);
  if (source === target) return { pins: normalizeGalleryPins(state.pins), tags: normalizeGalleryTagRecords(state.tags) };
  const mapId = (id: string) => id === source || isGalleryPathInside(id, source) ? mapGallerySubPath(id, source, target) : id;
  return {
    pins: normalizeGalleryPins(state.pins.map((item) => item.itemKind === 'folder' ? { ...item, itemId: mapId(item.itemId) } : item)),
    tags: normalizeGalleryTagRecords(state.tags.map((item) => item.itemKind === 'folder'
      ? { ...item, itemId: mapId(item.itemId), updatedAt: now }
      : item))
  };
}

export function copyGalleryMetadataState(
  state: Pick<GalleryCatalogDocumentsState, 'pins' | 'tags'>,
  mappings: GalleryCatalogMetadataCopyMapping[],
  now = Date.now()
): Pick<GalleryCatalogDocumentsState, 'pins' | 'tags'> {
  const pins = normalizeGalleryPins(state.pins);
  const tags = normalizeGalleryTagRecords(state.tags);
  return {
    pins: normalizeGalleryPins([...pins, ...mappings.flatMap((mapping) => pins.flatMap((item) => {
      const itemId = metadataCopyId(mapping, item.itemKind, item.itemId);
      return itemId ? [{ ...item, itemId, createdAt: now }] : [];
    }))]),
    tags: normalizeGalleryTagRecords([...tags, ...mappings.flatMap((mapping) => tags.flatMap((item) => {
      const itemId = metadataCopyId(mapping, item.itemKind, item.itemId);
      return itemId ? [{ ...item, itemId, tags: [...item.tags], updatedAt: now }] : [];
    }))])
  };
}

export function deleteGalleryMetadataState(
  state: Pick<GalleryCatalogDocumentsState, 'pins' | 'tags'>,
  selection: { folderPath?: string; taskIds?: string[] }
): Pick<GalleryCatalogDocumentsState, 'pins' | 'tags'> {
  const folderPath = selection.folderPath ? normalizeGalleryPath(selection.folderPath) : null;
  const taskIds = new Set(selection.taskIds ?? []);
  const shouldDelete = (item: { itemKind: GalleryMetadataKind; itemId: string }) => item.itemKind === 'task'
    ? taskIds.has(item.itemId)
    : Boolean(folderPath && (item.itemId === folderPath || isGalleryPathInside(item.itemId, folderPath)));
  return {
    pins: normalizeGalleryPins(state.pins.filter((item) => !shouldDelete(item))),
    tags: normalizeGalleryTagRecords(state.tags.filter((item) => !shouldDelete(item)))
  };
}

export function setGalleryPinnedState(
  pins: GalleryPinItem[],
  args: { itemKind: GalleryMetadataKind; itemId: string; pinned: boolean },
  now = Date.now()
): GalleryPinItem[] {
  const itemId = galleryMetadataId(args.itemKind, args.itemId);
  if (!itemId || itemId === '/') throw new Error('Pinned item id is required.');
  const key = galleryMetadataKey(args.itemKind, itemId);
  const remaining = normalizeGalleryPins(pins).filter((item) => galleryMetadataKey(item.itemKind, item.itemId) !== key);
  return args.pinned ? normalizeGalleryPins([...remaining, { itemKind: args.itemKind, itemId, createdAt: now }]) : remaining;
}

export function setGalleryTagsState(
  records: GalleryTagRecord[],
  args: { itemKind: GalleryMetadataKind; itemId: string; tags: string[] },
  now = Date.now()
): GalleryTagRecord[] {
  const itemId = galleryMetadataId(args.itemKind, args.itemId);
  if (!itemId || itemId === '/') throw new Error('Tagged item id is required.');
  const tags = [...new Set(args.tags.map(normalizeGalleryTag).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const key = galleryMetadataKey(args.itemKind, itemId);
  const remaining = normalizeGalleryTagRecords(records).filter((item) => galleryMetadataKey(item.itemKind, item.itemId) !== key);
  return tags.length > 0
    ? normalizeGalleryTagRecords([...remaining, { itemKind: args.itemKind, itemId, tags, updatedAt: now }])
    : remaining;
}
