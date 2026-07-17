import type { GalleryFolder } from '../../src/domain/galleryFilesystem';
import type { GalleryMetadataKind, GalleryPinItem, GalleryTagRecord } from '../../src/entities/gallery/galleryMetadata';
import { normalizeGenerationTasks } from '../../src/entities/storage';
import {
  galleryItemCanContainChildren,
  type GalleryItemKind,
  type GalleryPasteOperation
} from './descriptors';
import {
  copyGalleryMetadataState,
  createGalleryFolderState,
  deleteGalleryFolderState,
  deleteGalleryMetadataState,
  moveGalleryFolderItemState,
  pasteGalleryFolderState,
  remapGalleryFolderMetadataState,
  renameGalleryFolderState,
  setGalleryPinnedState,
  setGalleryTagsState,
  type GalleryCatalogDocumentsState,
  type GalleryCatalogMetadataCopyMapping,
  type GalleryFolderPasteItem,
  type GalleryFolderPasteMapping
} from './catalogState';
import {
  deleteGalleryFolderTasksState,
  moveGalleryFolderTasksState,
  moveGalleryTaskState,
  pasteGalleryTasksState,
  type ServerGalleryPasteItem
} from './taskState';
type GalleryPasteItem = GalleryFolderPasteItem;
import type { GenerationTaskGalleryMutationPort } from '../processes/generation-task-runtime/runtimePort';
import { commitGalleryMutation } from '../processes/generation-task-runtime/runtimeStore';
import {
  loadGalleryCatalogDocumentsAsync,
  loadGenerationTaskHistoryDocumentsByIdsAsync,
  saveGalleryCatalogStateDocumentsAsync
} from '../storage/generationTaskStoreAsync';
import { loadGalleryCatalogDocuments } from '../storage/galleryCatalogStore';

export type { GalleryCatalogMetadataCopyMapping } from './catalogState';

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
  createFolder(parentPath: string, name: string): Promise<{ folder: GalleryFolder; folders: GalleryFolder[] }>;
  renameFolder(path: string, name: string): Promise<{ folders: GalleryFolder[]; sourcePath: string; nextPath: string }>;
  deleteFolder(path: string): Promise<GalleryFolder[]>;
  moveItem(args: { itemKind: GalleryItemKind; itemId: string; targetPath: string }): Promise<{ folders: GalleryFolder[]; sourcePath?: string; nextPath?: string }>;
  pasteItems(args: { operation: GalleryPasteOperation; targetPath: string; items: GalleryPasteItem[] }): Promise<{ folders: GalleryFolder[]; mappings: GalleryFolderPasteMapping[] }>;
  setItemPinned(args: { itemKind: GalleryMetadataKind; itemId: string; pinned: boolean }): Promise<GalleryPinItem[]>;
  setItemTags(args: { itemKind: GalleryMetadataKind; itemId: string; tags: string[] }): Promise<GalleryTagRecord[]>;
}

function folderCopyMappings(mappings: GalleryFolderPasteMapping[]): GalleryCatalogMetadataCopyMapping[] {
  return mappings.map((mapping) => ({ itemKind: 'folder', sourceItemId: mapping.sourcePath, nextItemId: mapping.nextPath }));
}

function taskCopyMappings(mappings: Array<{ sourceTaskId: string; nextTaskId: string }>): GalleryCatalogMetadataCopyMapping[] {
  return mappings.map((mapping) => ({ itemKind: 'task', sourceItemId: mapping.sourceTaskId, nextItemId: mapping.nextTaskId }));
}

export function createGalleryCatalog(dependencies: GalleryCatalogDependencies): GalleryCatalog {
  const { folders, metadata, generationTasks } = dependencies;
  return {
    listFolders: () => folders.load(),
    listPins: () => metadata.loadPins(),
    listTags: () => metadata.loadTags(),
    createFolder: async (parentPath, name) => folders.create(parentPath, name),
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
      const taskResult = await generationTasks.pasteGalleryItems({ ...args, items: runtimeItems });
      if (args.operation === 'move') {
        for (const mapping of folderResult.mappings) metadata.remapFolder(mapping.sourcePath, mapping.nextPath);
      } else {
        metadata.copyItems([...folderCopyMappings(folderResult.mappings), ...taskCopyMappings(taskResult.copiedTasks)]);
      }
      return folderResult;
    },
    setItemPinned: async (args) => metadata.setPinned(args),
    setItemTags: async (args) => metadata.setTags(args)
  };
}

async function loadFullTasks(taskIds: string[]) {
  const loaded = await loadGenerationTaskHistoryDocumentsByIdsAsync(taskIds, 'full');
  return normalizeGenerationTasks(loaded.tasks, { interruptActive: false });
}

interface TransactionalCatalogPreparation<TResult> {
  tasks: import('../../src/domain/generationTask').GenerationTask[];
  documents: GalleryCatalogDocumentsState;
  result: TResult;
}

async function commitCatalogMutation<TResult>(
  prepare: (
    tasks: import('../../src/domain/generationTask').GenerationTask[],
    documents: GalleryCatalogDocumentsState
  ) => Promise<TransactionalCatalogPreparation<TResult>> | TransactionalCatalogPreparation<TResult>
): Promise<TResult> {
  return commitGalleryMutation(
    async (tasks) => {
      const documents = await loadGalleryCatalogDocumentsAsync();
      const prepared = await prepare(tasks, documents);
      return { tasks: prepared.tasks, payload: prepared.documents, result: prepared.result };
    },
    async (tasks, documents) => {
      await saveGalleryCatalogStateDocumentsAsync({ tasks, ...documents });
    }
  );
}

export function createDefaultGalleryCatalog(): GalleryCatalog {
  const readDocuments = () => loadGalleryCatalogDocuments();
  return {
    listFolders: () => readDocuments().folders,
    listPins: () => readDocuments().pins,
    listTags: () => readDocuments().tags,
    createFolder(parentPath, name) {
      return commitCatalogMutation((tasks, documents) => {
        const result = createGalleryFolderState(documents.folders, parentPath, name);
        return { tasks, documents: { ...documents, folders: result.folders }, result };
      });
    },
    renameFolder(path, name) {
      return commitCatalogMutation((tasks, documents) => {
        const result = renameGalleryFolderState(documents.folders, path, name);
        const metadata = remapGalleryFolderMetadataState(documents, result.sourcePath, result.nextPath);
        return {
          tasks: moveGalleryFolderTasksState(tasks, result.sourcePath, result.nextPath),
          documents: { folders: result.folders, ...metadata },
          result
        };
      });
    },
    deleteFolder(path) {
      return commitCatalogMutation((tasks, documents) => {
        const taskResult = deleteGalleryFolderTasksState(tasks, path);
        const metadata = deleteGalleryMetadataState(documents, { folderPath: path, taskIds: taskResult.result.deletedTaskIds });
        const folders = deleteGalleryFolderState(documents.folders, path);
        return { tasks: taskResult.tasks, documents: { folders, ...metadata }, result: folders };
      });
    },
    moveItem(args) {
      return commitCatalogMutation((tasks, documents) => {
        const folderResult = moveGalleryFolderItemState({ folders: documents.folders, ...args });
        if (!galleryItemCanContainChildren(args.itemKind)) {
          return {
            tasks: moveGalleryTaskState(tasks, args.itemId, args.targetPath),
            documents: { ...documents, folders: folderResult.folders },
            result: folderResult
          };
        }
        if (!folderResult.sourcePath || !folderResult.nextPath) {
          return { tasks, documents: { ...documents, folders: folderResult.folders }, result: folderResult };
        }
        const metadata = remapGalleryFolderMetadataState(documents, folderResult.sourcePath, folderResult.nextPath);
        return {
          tasks: moveGalleryFolderTasksState(tasks, folderResult.sourcePath, folderResult.nextPath),
          documents: { folders: folderResult.folders, ...metadata },
          result: folderResult
        };
      });
    },
    pasteItems(args) {
      return commitCatalogMutation(async (tasks, documents) => {
        const folderResult = pasteGalleryFolderState({
          folders: documents.folders,
          operation: args.operation,
          targetPath: args.targetPath,
          items: args.items as GalleryFolderPasteItem[]
        });
        const runtimeItems: ServerGalleryPasteItem[] = [
          ...args.items.filter((item) => !galleryItemCanContainChildren(item.itemKind)),
          ...folderResult.mappings
        ];
        const taskResult = await pasteGalleryTasksState({ ...args, tasks, items: runtimeItems, loadFullTasks });
        let metadata: Pick<GalleryCatalogDocumentsState, 'pins' | 'tags'> = documents;
        if (args.operation === 'move') {
          for (const mapping of folderResult.mappings) {
            metadata = remapGalleryFolderMetadataState(metadata, mapping.sourcePath, mapping.nextPath);
          }
        } else {
          metadata = copyGalleryMetadataState(documents, [
            ...folderCopyMappings(folderResult.mappings),
            ...taskCopyMappings(taskResult.result.copiedTasks)
          ]);
        }
        return {
          tasks: taskResult.tasks,
          documents: { folders: folderResult.folders, ...metadata },
          result: folderResult
        };
      });
    },
    setItemPinned(args) {
      return commitCatalogMutation((tasks, documents) => {
        const pins = setGalleryPinnedState(documents.pins, args);
        return { tasks, documents: { ...documents, pins }, result: pins };
      });
    },
    setItemTags(args) {
      return commitCatalogMutation((tasks, documents) => {
        const tags = setGalleryTagsState(documents.tags, args);
        return { tasks, documents: { ...documents, tags }, result: tags };
      });
    }
  };
}
