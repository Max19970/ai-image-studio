import type express from 'express';
import { sendServerError } from '../http/errors';
import {
  createGenerationTaskArchiveDownload,
  createGenerationTaskImageDownloadRegistration
} from '../processes/generation-task-downloads/downloadUseCases';
import {
  absolutePublicUrl,
  getTemporaryImageDownload,
  sendImageDownloadResponse
} from './generationTaskDownloadHelpers';

function sendDownloadUseCaseError(res: express.Response, result: { status: number; message: string }) {
  res.status(result.status).json({ error: { message: result.message } });
}

function archiveContentDisposition(filename: string): string {
  return `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')}"`;
}

export function registerGenerationTaskDownloadRoutes(app: express.Express) {
  app.post('/api/storage/generation-task-downloads', (req, res) => {
    try {
      const result = createGenerationTaskImageDownloadRegistration(req.body ?? {}, (path) => absolutePublicUrl(req, path));
      if (!result.ok) {
        sendDownloadUseCaseError(res, result);
        return;
      }
      res.json(result);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/storage/generation-task-downloads/archive', (req, res) => {
    try {
      const result = createGenerationTaskArchiveDownload(req.body ?? {});
      if (!result.ok) {
        sendDownloadUseCaseError(res, result);
        return;
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Length', String(result.archive.length));
      res.setHeader('Content-Disposition', archiveContentDisposition(result.filename));
      res.setHeader('Cache-Control', 'private, max-age=60, no-transform');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.end(result.archive);
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
