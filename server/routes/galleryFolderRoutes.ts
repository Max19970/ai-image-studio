import type express from 'express';
import { normalizeGalleryPath } from '../../src/domain/galleryFilesystem';
import { sendServerError } from '../http/errors';
import {
  createGalleryFolder,
  deleteGalleryFolder,
  ensureGalleryFolderAncestors,
  loadGalleryFolders,
  moveGalleryItemPath,
  pasteGalleryFolderItems,
  type GalleryPasteItem,
  type GalleryPasteOperation
} from '../storage/galleryFoldersStore';
import {
  deleteServerGalleryFolderTasks,
  moveServerGalleryFolderTasks,
  moveServerGalleryTask,
  pasteServerGalleryItems
} from '../processes/generationTaskRuntime';
import {
  loadGalleryPins,
  loadGalleryTagRecords,
  setGalleryItemPinned,
  setGalleryItemTags
} from '../storage/galleryMetadataStore';

function booleanField(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function parsePasteOperation(value: unknown): GalleryPasteOperation {
  if (value === 'link-copy' || value === 'deep-copy') return value;
  return 'move';
}

function parsePasteItems(value: unknown): GalleryPasteItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const source = item as { itemKind?: unknown; itemId?: unknown; sourcePath?: unknown };
    const itemKind = source.itemKind === 'folder' ? 'folder' : 'task';
    const itemId = typeof source.itemId === 'string' ? source.itemId : '';
    const sourcePath = normalizeGalleryPath(source.sourcePath);
    return itemId ? [{ itemKind, itemId, sourcePath }] : [];
  });
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}

export function registerGalleryFolderRoutes(app: express.Express) {
  app.get('/api/storage/gallery-folders', (_req, res) => {
    try {
      res.json({ folders: loadGalleryFolders() });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/gallery-pins', (_req, res) => {
    try {
      res.json({ pins: loadGalleryPins() });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/gallery-tags', (_req, res) => {
    try {
      res.json({ tags: loadGalleryTagRecords() });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/gallery-folders', (req, res) => {
    try {
      const parentPath = normalizeGalleryPath(req.body?.parentPath);
      const name = typeof req.body?.name === 'string' ? req.body.name : '';
      const folder = createGalleryFolder(parentPath, name);
      res.status(201).json({ folder, folders: ensureGalleryFolderAncestors(folder.path) });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.delete('/api/storage/gallery-folders', async (req, res) => {
    try {
      const path = normalizeGalleryPath(req.query.path);
      const folders = deleteGalleryFolder(path);
      await deleteServerGalleryFolderTasks(path);
      res.json({ ok: true, folders });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/gallery-items/move', async (req, res) => {
    try {
      const itemKind = req.body?.itemKind === 'folder' ? 'folder' : 'task';
      const itemId = typeof req.body?.itemId === 'string' ? req.body.itemId : '';
      const targetPath = normalizeGalleryPath(req.body?.targetPath);
      const result = moveGalleryItemPath({ itemKind, itemId, targetPath });
      if (itemKind === 'task') {
        await moveServerGalleryTask(itemId, targetPath);
      } else if (result.sourcePath && result.nextPath) {
        await moveServerGalleryFolderTasks(result.sourcePath, result.nextPath);
      }
      res.json({ ok: true, ...result });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/gallery-items/paste', async (req, res) => {
    try {
      const operation = parsePasteOperation(req.body?.operation);
      const targetPath = normalizeGalleryPath(req.body?.targetPath);
      const items = parsePasteItems(req.body?.items);
      const folderResult = pasteGalleryFolderItems({ operation, targetPath, items });
      const runtimeItems = [
        ...items.filter((item) => item.itemKind === 'task'),
        ...folderResult.mappings
      ];
      await pasteServerGalleryItems({ operation, targetPath, items: runtimeItems });
      res.json({ ok: true, folders: folderResult.folders, mappings: folderResult.mappings });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/gallery-items/pin', (req, res) => {
    try {
      const itemKind = req.body?.itemKind === 'folder' ? 'folder' : 'task';
      const itemId = typeof req.body?.itemId === 'string' ? req.body.itemId : '';
      const pinned = booleanField(req.body?.pinned);
      const pins = setGalleryItemPinned({ itemKind, itemId, pinned });
      res.json({ ok: true, pins });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/gallery-items/tags', (req, res) => {
    try {
      const itemKind = req.body?.itemKind === 'folder' ? 'folder' : 'task';
      const itemId = typeof req.body?.itemId === 'string' ? req.body.itemId : '';
      const tags = setGalleryItemTags({ itemKind, itemId, tags: parseTags(req.body?.tags) });
      res.json({ ok: true, tags });
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
