import type express from 'express';
import {
  auditGenerationTaskStorageDocuments,
  clearGenerationTaskHistoryDocuments,
  getGenerationTaskStorageDiagnostics,
  loadGenerationTaskAssetDocument,
  loadGenerationTaskHistoryDocuments,
  saveGenerationTaskHistoryDocuments
} from '../storage/generationTaskStore';
import { sendServerError } from '../http/errors';
import {
  absolutePublicUrl,
  createTemporaryImageDownload,
  getTemporaryImageDownload,
  parseImageDataUrlForDownload,
  sendImageDownloadResponse,
  sanitizeDownloadFilename
} from './generationTaskDownloadHelpers';

export function registerGenerationTaskStorageRoutes(app: express.Express) {
  app.get('/api/storage/generation-tasks/diagnostics', (_req, res) => {
    try {
      res.json(getGenerationTaskStorageDiagnostics());
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/generation-tasks/audit', (_req, res) => {
    try {
      res.json(auditGenerationTaskStorageDocuments());
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/generation-tasks', (req, res) => {
    try {
      const limit = Number(req.query.limit ?? 120);
      const offset = Number(req.query.offset ?? 0);
      const assetMode = req.query.assetMode === 'thumbnail' || req.query.assetMode === 'metadata' ? req.query.assetMode : 'full';
      const { tasks, stats } = loadGenerationTaskHistoryDocuments({ limit, offset, assetMode });
      res.json({ tasks, storage: stats, pagination: { limit, offset, assetMode } });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/generation-task-asset', (req, res) => {
    try {
      const key = String(req.query.key ?? '');
      if (!key) {
        res.status(400).json({ error: { message: 'Missing generation task asset key.' } });
        return;
      }
      const image = loadGenerationTaskAssetDocument(key);
      if (!image) {
        res.status(404).json({ error: { message: 'Generation task asset not found.' } });
        return;
      }
      res.json({ image });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/generation-task-asset/download', (req, res) => {
    try {
      const key = String(req.query.key ?? '');
      if (!key) {
        res.status(400).json({ error: { message: 'Missing generation task asset key.' } });
        return;
      }
      const image = loadGenerationTaskAssetDocument(key);
      if (!image) {
        res.status(404).json({ error: { message: 'Generation task asset not found.' } });
        return;
      }
      const src = typeof image.src === 'string' ? image.src : '';
      const parsed = parseImageDataUrlForDownload(src);
      if (!parsed) {
        res.status(422).json({ error: { message: 'Generation task asset is not a downloadable image data URL.' } });
        return;
      }
      const filename = sanitizeDownloadFilename(req.query.filename, parsed.extension);
      sendImageDownloadResponse(res, parsed, filename);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/generation-task-downloads', (req, res) => {
    try {
      const filename = req.body?.filename;
      const assetKey = typeof req.body?.storageAssetKey === 'string' ? req.body.storageAssetKey : '';
      if (assetKey) {
        const image = loadGenerationTaskAssetDocument(assetKey);
        if (!image) {
          res.status(404).json({ error: { message: 'Generation task asset not found.' } });
          return;
        }
        const parsed = parseImageDataUrlForDownload(typeof image.src === 'string' ? image.src : '');
        if (!parsed) {
          res.status(422).json({ error: { message: 'Generation task asset is not a downloadable image data URL.' } });
          return;
        }
        const safeFilename = sanitizeDownloadFilename(filename, parsed.extension);
        const params = new URLSearchParams({ key: assetKey, filename: safeFilename });
        res.json({ id: null, url: absolutePublicUrl(req, `/api/storage/generation-task-asset/download?${params}`), filename: safeFilename, expiresAt: null, mediaType: parsed.mediaType });
        return;
      }
      const src = typeof req.body?.src === 'string' ? req.body.src : '';
      const download = createTemporaryImageDownload(src, filename);
      if (!download) {
        res.status(422).json({ error: { message: 'Request body must include a downloadable image data URL.' } });
        return;
      }
      res.json({
        id: download.id,
        url: absolutePublicUrl(req, `/api/storage/generation-task-downloads/${encodeURIComponent(download.id)}`),
        filename: download.filename,
        expiresAt: download.expiresAt,
        mediaType: download.parsed.mediaType
      });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/generation-task-downloads/:id', (req, res) => {
    try {
      const download = getTemporaryImageDownload(String(req.params.id ?? ''));
      if (!download) {
        res.status(404).json({ error: { message: 'Temporary image download not found or expired.' } });
        return;
      }
      sendImageDownloadResponse(res, download.parsed, download.filename);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.put('/api/storage/generation-tasks', (req, res) => {
    try {
      const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
      const stats = saveGenerationTaskHistoryDocuments(tasks);
      res.json({ ok: true, count: tasks.length, storage: stats });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.delete('/api/storage/generation-tasks', (_req, res) => {
    try {
      const stats = clearGenerationTaskHistoryDocuments();
      res.json({ ok: true, count: 0, storage: stats });
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
