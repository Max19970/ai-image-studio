import type { GalleryFolder } from '../../src/domain/galleryFilesystem';
import type { GalleryMetadataKind, GalleryPinItem, GalleryTagRecord } from '../../src/entities/gallery/galleryMetadata';
import {
  galleryItemCanContainChildren,
  type GalleryItemKind,
  type GalleryPasteOperation
} from './descriptors';
import {
  createGalleryFolder,
  deleteGalleryFolder,
  ensureGalleryFolderAncestors,
  loadGalleryFolders,
  moveGalleryItemPath,
  pasteGalleryFolderItems,
  renameGalleryFolder,
  type GalleryFolderPasteMapping,
  type GalleryPasteItem
} from '../storage/galleryFoldersStore';
import {
  copyGalleryItemMetadata,
  deleteGalleryItemMetadata,
  loadGalleryPins,
  loadGalleryTagRecords,
  remapGalleryFolderMetadata,
  setGalleryItemPinned,
  setGalleryItemTags
} from '../storage/galleryMetadataStore';
import type {
  GenerationTaskGalleryMutationPort,
  ServerGalleryPasteItem
} from '../processes/generation-task-runtime/runtimePort';

export interface GalleryCatalogMetadataCopyMapping {
  itemKind: GalleryMetadataKind;
  sourceItemId: string;
  nextItemId: string;
}

export interface GalleryCatalogFolderPort {
  load(): GalleryFolder[];
  create(parentPath: string, name: string): { folder: GalleryFolder; folders: GalleryFolder[] };
  rename(path: string, name: string): { folders: GalleryFolder[]; sourcePath: string; nextPath: string };
  delete(path: string): GalleryFolder[];
  moveItem(args: { itemKind: GalleryItemKind; itemId: string; targetPath: string }): { folders: GalleryFolder[]; sourcePath?: string; nextPath?: string };
  pasteItems(args: { operation: GalleryPasteOperation; targetPath: string; items: GalleryPasteItem[] }): { folders: GalleryFolder[]; mappings: GalleryFolderPasteMapping[] };
}

export interface GalleryCatalogMetadataPort {
  loadPins(): GalleryPinItem[];
  loadTags(): GalleryTagRecord[];
  setPinned(args: { itemKind: GalleryMetadataKind; itemId: string; pinned: boolean }): GalleryPinItem[];
  setTags(args: { itemKind: GalleryMetadataKind; itemId: string; tags: string[] }): GalleryTagRecord[];
  remapFolder(sourcePath: string, nextPath: string): void;
  copyItems(mappings: GalleryCatalogMetadataCopyMapping[]): void;
  deleteItems(selection: { folderPath?: string; taskIds?: string[] }): void;
}

export interface GalleryCatalogDependencies {
  folders: GalleryCatalogFolderPort;
  metadata: GalleryCatalogMetadataPort;
  generationTasks: GenerationTaskGalleryMutationPort;
}

export interface GalleryCatalog {
  listFolders(): GalleryFolder[];
  listPins(): GalleryPinItem[];
  listTags(): GalleryTagRecord[];
  createFolder(parentPath: string, name: string): { folder: GalleryFolder; folders: GalleryFolder[] };
  renameFolder(path: string, name: string): Promise<{ folders: GalleryFolder[]; sourcePath: string; nextPath: string }>;
  deleteFolder(path: string): Promise<GalleryFolder[]>;
  moveItem(args: { itemKind: GalleryItemKind; itemId: string; targetPath: string }): Promise<{ folders: GalleryFolder[]; sourcePath?: string; nextPath?: string }>;
  pasteItems(args: { operation: GalleryPasteOperation; targetPath: string; items: GalleryPasteItem[] }): Promise<{ folders: GalleryFolder[]; mappings: GalleryFolderPasteMapping[] }>;
  setItemPinned(args: { itemKind: GalleryMetadataKind; itemId: string; pinned: boolean }): GalleryPinItem[];
  setItemTags(args: { itemKind: GalleryMetadataKind; itemId: string; tags: string[] }): GalleryTagRecord[];
}

function folderCopyMappings(mappings: GalleryFolderPasteMapping[]): GalleryCatalogMetadataCopyMapping[] {
  return mappings.map((mapping) => ({
    itemKind: 'folder',
    sourceItemId: mapping.sourcePath,
    nextItemId: mapping.nextPath
  }));
}

function taskCopyMappings(mappings: Array<{ sourceTaskId: string; nextTaskId: string }>): GalleryCatalogMetadataCopyMapping[] {
  return mappings.map((mapping) => ({
    itemKind: 'task',
    sourceItemId: mapping.sourceTaskId,
    nextItemId: mapping.nextTaskId
  }));
}

export function createGalleryCatalog(dependencies: GalleryCatalogDependencies): GalleryCatalog {
  const { folders, metadata, generationTasks } = dependencies;
  return {
    listFolders: () => folders.load(),
    listPins: () => metadata.loadPins(),
    listTags: () => metadata.loadTags(),
    createFolder: (parentPath, name) => folders.create(parentPath, name),
    async renameFolder(path, name) {
      const result = folders.rename(path, name);
      await generationTasks.moveGalleryFolderTasks(result.sourcePath, result.nextPath);
      metadata.remapFolder(result.sourcePath, result.nextPath);
      return result;
    },
    async deleteFolder(path) {
      const nextFolders = folders.delete(path);
      const result = await generationTasks.deleteGalleryFolderTasks(path);
      metadata.deleteItems({ folderPath: path, taskIds: result.deletedTaskIds });
      return nextFolders;
    },
    async moveItem(args) {
      const result = folders.moveItem(args);
      if (!galleryItemCanContainChildren(args.itemKind)) {
        await generationTasks.moveGalleryTask(args.itemId, args.targetPath);
      } else if (result.sourcePath && result.nextPath) {
        await generationTasks.moveGalleryFolderTasks(result.sourcePath, result.nextPath);
        metadata.remapFolder(result.sourcePath, result.nextPath);
      }
      return result;
    },
    async pasteItems(args) {
      const folderResult = folders.pasteItems(args);
      const runtimeItems: ServerGalleryPasteItem[] = [
        ...args.items.filter((item) => !galleryItemCanContainChildren(item.itemKind)),
        ...folderResult.mappings
      ];
      const taskResult = await generationTasks.pasteGalleryItems({
        operation: args.operation,
        targetPath: args.targetPath,
        items: runtimeItems
      });
      if (args.operation === 'move') {
        for (const mapping of folderResult.mappings) metadata.remapFolder(mapping.sourcePath, mapping.nextPath);
      } else {
        metadata.copyItems([
          ...folderCopyMappings(folderResult.mappings),
          ...taskCopyMappings(taskResult.copiedTasks)
        ]);
      }
      return folderResult;
    },
    setItemPinned: (args) => metadata.setPinned(args),
    setItemTags: (args) => metadata.setTags(args)
  };
}

export function createDefaultGalleryCatalog(generationTasks: GenerationTaskGalleryMutationPort): GalleryCatalog {
  return createGalleryCatalog({
    folders: {
      load: loadGalleryFolders,
      create(parentPath, name) {
        const folder = createGalleryFolder(parentPath, name);
        return { folder, folders: ensureGalleryFolderAncestors(folder.path) };
      },
      rename: renameGalleryFolder,
      delete: deleteGalleryFolder,
      moveItem: moveGalleryItemPath,
      pasteItems: pasteGalleryFolderItems
    },
    metadata: {
      loadPins: loadGalleryPins,
      loadTags: loadGalleryTagRecords,
      setPinned: setGalleryItemPinned,
      setTags: setGalleryItemTags,
      remapFolder: remapGalleryFolderMetadata,
      copyItems: copyGalleryItemMetadata,
      deleteItems: deleteGalleryItemMetadata
    },
    generationTasks
  });
}
