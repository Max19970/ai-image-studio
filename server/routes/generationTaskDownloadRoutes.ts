import type express from 'express';
import { loadGenerationTaskAssetDocument } from '../storage/generationTaskStore';
import { sendServerError } from '../http/errors';
import {
  absolutePublicUrl,
  createTemporaryImageDownload,
  getTemporaryImageDownload,
  parseImageDataUrlForDownload,
  sanitizeDownloadFilename,
  sendImageDownloadResponse
} from './generationTaskDownloadHelpers';

export function registerGenerationTaskDownloadRoutes(app: express.Express) {
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
        const url = absolutePublicUrl(req, '/api/storage/generation-task-asset/download?' + params.toString());
        res.json({ id: null, url, filename: safeFilename, expiresAt: null, mediaType: parsed.mediaType });
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
        url: absolutePublicUrl(req, '/api/storage/generation-task-downloads/' + encodeURIComponent(download.id)),
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
}
