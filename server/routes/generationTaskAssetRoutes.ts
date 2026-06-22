import type express from 'express';
import { loadGenerationTaskAssetDocument } from '../storage/generationTaskStore';
import { sendServerError } from '../http/errors';
import {
  parseImageDataUrlForDownload,
  sanitizeDownloadFilename,
  sendImageDownloadResponse
} from './generationTaskDownloadHelpers';

export function registerGenerationTaskAssetRoutes(app: express.Express) {
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

  app.get('/api/storage/generation-task-asset/image', (req, res) => {
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
      const parsed = parseImageDataUrlForDownload(typeof image.src === 'string' ? image.src : '');
      if (!parsed) {
        res.status(422).json({ error: { message: 'Generation task asset is not an image data URL.' } });
        return;
      }
      res.setHeader('Content-Type', parsed.mediaType);
      res.setHeader('Content-Length', String(parsed.buffer.length));
      res.setHeader('Cache-Control', 'private, max-age=300, no-transform');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(parsed.buffer);
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
      const parsed = parseImageDataUrlForDownload(typeof image.src === 'string' ? image.src : '');
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
}
