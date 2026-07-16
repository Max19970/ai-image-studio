import { useEffect, useState } from 'react';
import type { GalleryFolder } from '../../../domain/galleryFilesystem';
import { galleryRootPath, mapGallerySubPath, normalizeGalleryPath } from '../../../domain/galleryFilesystem';
import type { GalleryClipboardItemPayload, GalleryClipboardOperation } from '../../../entities/gallery/galleryClipboard';
import type { GalleryMetadataKind, GalleryPinItem, GalleryTagRecord } from '../../../entities/gallery/galleryMetadata';
import {
  createRemoteGalleryFolder,
  deleteRemoteGalleryFolder,
  loadRemoteGalleryFolders,
  moveRemoteGalleryItem,
  pasteRemoteGalleryItems,
  renameRemoteGalleryFolder,
} from '../../../infrastructure/storage/remoteGalleryFolderStore';
import {
  loadRemoteGalleryPins,
  loadRemoteGalleryTagRecords,
  setRemoteGalleryPin,
  setRemoteGalleryTags
} from '../../../infrastructure/storage/remoteGalleryMetadataStore';
import type { StateSetter } from '../types';

export interface GalleryFilesystemState {
  activeGalleryPath: string;
  setActiveGalleryPath: StateSetter<string>;
  galleryFolders: GalleryFolder[];
  setGalleryFolders: StateSetter<GalleryFolder[]>;
  galleryPins: GalleryPinItem[];
  setGalleryPins: StateSetter<GalleryPinItem[]>;
  galleryTagRecords: GalleryTagRecord[];
  setGalleryTagRecords: StateSetter<GalleryTagRecord[]>;
  refreshGalleryFolders: () => Promise<void>;
  refreshGalleryMetadata: () => Promise<void>;
  createGalleryFolder: (name: string) => Promise<void>;
  createGalleryFolderAt: (parentPath: string, name: string) => Promise<void>;
  renameGalleryFolder: (path: string, name: string) => Promise<void>;
  deleteGalleryFolder: (path: string) => Promise<void>;
  moveGalleryItem: (itemKind: 'task' | 'folder', itemId: string, targetPath: string) => Promise<void>;
  pasteGalleryItems: (operation: GalleryClipboardOperation, items: GalleryClipboardItemPayload[], targetPath: string) => Promise<void>;
  setGalleryItemPinned: (itemKind: GalleryMetadataKind, itemId: string, pinned: boolean) => Promise<void>;
  setGalleryItemTags: (itemKind: GalleryMetadataKind, itemId: string, tags: string[]) => Promise<void>;
}

const activeGalleryPathStorageKey = 'image-studio.active-gallery-path.v1';

function loadActiveGalleryPath(): string {
  if (typeof window === 'undefined') return galleryRootPath;
  return normalizeGalleryPath(window.localStorage.getItem(activeGalleryPathStorageKey));
}

export function useGalleryFilesystemState(): GalleryFilesystemState {
  const [activeGalleryPath, setActiveGalleryPathState] = useState(loadActiveGalleryPath);
  const [galleryFolders, setGalleryFolders] = useState<GalleryFolder[]>([]);
  const [galleryPins, setGalleryPins] = useState<GalleryPinItem[]>([]);
  const [galleryTagRecords, setGalleryTagRecords] = useState<GalleryTagRecord[]>([]);

  const setActiveGalleryPath: StateSetter<string> = (value) => {
    setActiveGalleryPathState((prev) => {
      const next = normalizeGalleryPath(typeof value === 'function' ? value(prev) : value);
      if (typeof window !== 'undefined') window.localStorage.setItem(activeGalleryPathStorageKey, next);
      return next;
    });
  };

  const refreshGalleryFolders = async () => {
    setGalleryFolders(await loadRemoteGalleryFolders());
  };

  const refreshGalleryMetadata = async () => {
    const [pins, tags] = await Promise.all([loadRemoteGalleryPins(), loadRemoteGalleryTagRecords()]);
    setGalleryPins(pins);
    setGalleryTagRecords(tags);
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadRemoteGalleryFolders(), loadRemoteGalleryPins(), loadRemoteGalleryTagRecords()])
      .then(([folders, pins, tags]) => {
        if (cancelled) return;
        setGalleryFolders(folders);
        setGalleryPins(pins);
        setGalleryTagRecords(tags);
        setActiveGalleryPath((current) => current === galleryRootPath || folders.some((folder) => folder.path === current) ? current : galleryRootPath);
      })
      .catch((error) => {
        console.warn('Could not load gallery filesystem metadata.', error);
      });
    return () => { cancelled = true; };
  }, []);

  return {
    activeGalleryPath,
    setActiveGalleryPath,
    galleryFolders,
    setGalleryFolders,
    galleryPins,
    setGalleryPins,
    galleryTagRecords,
    setGalleryTagRecords,
    refreshGalleryFolders,
    refreshGalleryMetadata,
    createGalleryFolder: async (name) => {
      setGalleryFolders(await createRemoteGalleryFolder(activeGalleryPath, name));
    },
    createGalleryFolderAt: async (parentPath, name) => {
      setGalleryFolders(await createRemoteGalleryFolder(parentPath, name));
    },
    renameGalleryFolder: async (path, name) => {
      const result = await renameRemoteGalleryFolder(path, name);
      setGalleryFolders(result.folders);
      await refreshGalleryMetadata();
      setActiveGalleryPath((current) => current === result.sourcePath || current.startsWith(`${result.sourcePath}/`)
        ? mapGallerySubPath(current, result.sourcePath, result.nextPath)
        : current);
    },
    deleteGalleryFolder: async (path) => {
      const normalized = normalizeGalleryPath(path);
      setGalleryFolders(await deleteRemoteGalleryFolder(normalized));
      await refreshGalleryMetadata();
      setActiveGalleryPath((current) => current === normalized || current.startsWith(`${normalized}/`) ? galleryRootPath : current);
    },
    moveGalleryItem: async (itemKind, itemId, targetPath) => {
      setGalleryFolders(await moveRemoteGalleryItem({ itemKind, itemId, targetPath }));
      await refreshGalleryFolders();
      await refreshGalleryMetadata();
    },
    pasteGalleryItems: async (operation, items, targetPath) => {
      setGalleryFolders(await pasteRemoteGalleryItems({ operation, items, targetPath }));
      await refreshGalleryFolders();
      await refreshGalleryMetadata();
    },
    setGalleryItemPinned: async (itemKind, itemId, pinned) => {
      setGalleryPins(await setRemoteGalleryPin({ itemKind, itemId, pinned }));
    },
    setGalleryItemTags: async (itemKind, itemId, tags) => {
      setGalleryTagRecords(await setRemoteGalleryTags({ itemKind, itemId, tags }));
    }
  };
}
