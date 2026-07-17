import type express from 'express';
import { normalizeGalleryPath } from '../../src/domain/galleryFilesystem';
import { isGalleryItemKind, isGalleryPasteOperation, type GalleryItemKind } from '../gallery/descriptors';
import type { GalleryCatalog } from '../gallery/catalog';
import type { GalleryFolderPasteItem as GalleryPasteItem } from '../gallery/catalogState';
import type { GalleryPasteOperation } from '../gallery/descriptors';
import { sendServerError } from '../http/errors';

function booleanField(value: unknown): boolean {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function parseGalleryItemKind(value: unknown): GalleryItemKind {
  return isGalleryItemKind(value) ? value : 'task';
}

function parsePasteOperation(value: unknown): GalleryPasteOperation {
  return isGalleryPasteOperation(value) ? value : 'move';
}

function parsePasteItems(value: unknown): GalleryPasteItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const source = item as { itemKind?: unknown; itemId?: unknown; sourcePath?: unknown };
    const itemKind = parseGalleryItemKind(source.itemKind);
    const itemId = typeof source.itemId === 'string' ? source.itemId : '';
    const sourcePath = normalizeGalleryPath(source.sourcePath);
    return itemId ? [{ itemKind, itemId, sourcePath }] : [];
  });
}

function parseTags(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

export function registerGalleryFolderRoutes(app: express.Express, catalog: GalleryCatalog) {
  app.get('/api/storage/gallery-folders', (_req, res) => {
    try {
      res.json({ folders: catalog.listFolders() });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/gallery-pins', (_req, res) => {
    try {
      res.json({ pins: catalog.listPins() });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/gallery-tags', (_req, res) => {
    try {
      res.json({ tags: catalog.listTags() });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/gallery-folders', async (req, res) => {
    try {
      const parentPath = normalizeGalleryPath(req.body?.parentPath);
      const name = typeof req.body?.name === 'string' ? req.body.name : '';
      const result = await catalog.createFolder(parentPath, name);
      res.status(201).json(result);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.patch('/api/storage/gallery-folders', async (req, res) => {
    try {
      const path = normalizeGalleryPath(req.body?.path);
      const name = typeof req.body?.name === 'string' ? req.body.name : '';
      res.json({ ok: true, ...(await catalog.renameFolder(path, name)) });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.delete('/api/storage/gallery-folders', async (req, res) => {
    try {
      const folders = await catalog.deleteFolder(normalizeGalleryPath(req.query.path));
      res.json({ ok: true, folders });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/gallery-items/move', async (req, res) => {
    try {
      const result = await catalog.moveItem({
        itemKind: parseGalleryItemKind(req.body?.itemKind),
        itemId: typeof req.body?.itemId === 'string' ? req.body.itemId : '',
        targetPath: normalizeGalleryPath(req.body?.targetPath)
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/gallery-items/paste', async (req, res) => {
    try {
      const result = await catalog.pasteItems({
        operation: parsePasteOperation(req.body?.operation),
        targetPath: normalizeGalleryPath(req.body?.targetPath),
        items: parsePasteItems(req.body?.items)
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/gallery-items/pin', async (req, res) => {
    try {
      const pins = await catalog.setItemPinned({
        itemKind: parseGalleryItemKind(req.body?.itemKind),
        itemId: typeof req.body?.itemId === 'string' ? req.body.itemId : '',
        pinned: booleanField(req.body?.pinned)
      });
      res.json({ ok: true, pins });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/gallery-items/tags', async (req, res) => {
    try {
      const tags = await catalog.setItemTags({
        itemKind: parseGalleryItemKind(req.body?.itemKind),
        itemId: typeof req.body?.itemId === 'string' ? req.body.itemId : '',
        tags: parseTags(req.body?.tags)
      });
      res.json({ ok: true, tags });
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
