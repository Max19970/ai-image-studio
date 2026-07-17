import type { GalleryFolder } from '../../src/domain/galleryFilesystem';
import { normalizeGalleryFolders } from '../../src/domain/galleryFilesystem';
import {
  normalizeGalleryPins,
  normalizeGalleryTagRecords,
  type GalleryPinItem,
  type GalleryTagRecord
} from '../../src/entities/gallery/galleryMetadata';
import {
  generationGalleryFolderBucket,
  generationGalleryPinBucket,
  generationGalleryTagBucket,
  getStorageDb,
  loadEncryptedDocument,
  saveEncryptedDocument
} from './encryptedStore';
import {
  finalizeGenerationTaskHistoryTransaction,
  saveGenerationTaskHistoryDocumentsInTransaction
} from './generation-tasks/generationTaskRepository';

const galleryFoldersKey = 'folders';
const galleryPinsKey = 'items';
const galleryTagsKey = 'items';

export interface GalleryCatalogDocuments {
  folders: GalleryFolder[];
  pins: GalleryPinItem[];
  tags: GalleryTagRecord[];
}

export interface GalleryCatalogPersistedState extends GalleryCatalogDocuments {
  tasks: unknown[];
}

export function loadGalleryCatalogDocuments(): GalleryCatalogDocuments {
  return {
    folders: normalizeGalleryFolders(loadEncryptedDocument(generationGalleryFolderBucket, galleryFoldersKey, [])),
    pins: normalizeGalleryPins(loadEncryptedDocument(generationGalleryPinBucket, galleryPinsKey, [])),
    tags: normalizeGalleryTagRecords(loadEncryptedDocument(generationGalleryTagBucket, galleryTagsKey, []))
  };
}

export function saveGalleryCatalogStateDocuments(state: GalleryCatalogPersistedState) {
  const db = getStorageDb();
  const documents: GalleryCatalogDocuments = {
    folders: normalizeGalleryFolders(state.folders),
    pins: normalizeGalleryPins(state.pins),
    tags: normalizeGalleryTagRecords(state.tags)
  };

  db.exec('BEGIN');
  try {
    saveGenerationTaskHistoryDocumentsInTransaction(state.tasks);
    saveEncryptedDocument(generationGalleryFolderBucket, galleryFoldersKey, documents.folders);
    saveEncryptedDocument(generationGalleryPinBucket, galleryPinsKey, documents.pins);
    saveEncryptedDocument(generationGalleryTagBucket, galleryTagsKey, documents.tags);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return {
    documents,
    storage: finalizeGenerationTaskHistoryTransaction()
  };
}
