import type express from 'express';
import { sendServerError } from '../http/errors';
import {
  createGenerationTaskArchiveDownload,
  createGenerationTaskImageDownloadRegistration
} from '../processes/generation-task-downloads/downloadUseCases';
import {
  absolutePublicUrl,
  createTemporaryBinaryDownload,
  getTemporaryBinaryDownload,
  getTemporaryImageDownload,
  sendBinaryDownloadResponse,
  sendImageDownloadResponse
} from './generationTaskDownloadHelpers';

function sendDownloadUseCaseError(res: express.Response, result: { status: number; message: string }) {
  res.status(result.status).json({ error: { message: result.message } });
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

      if (req.body?.delivery === 'url') {
        const prepared = createTemporaryBinaryDownload(result.archive, result.filename, 'application/zip', 'zip');
        if (!prepared) {
          res.status(422).json({ error: { message: 'Could not prepare archive.' } });
          return;
        }
        const route = '/api/storage/generation-task-downloads/file/' + encodeURIComponent(prepared.id);
        res.json({
          id: prepared.id,
          url: absolutePublicUrl(req, route),
          filename: prepared.filename,
          expiresAt: prepared.expiresAt,
          mediaType: prepared.mediaType
        });
        return;
      }

      sendBinaryDownloadResponse(res, result.archive, result.filename, 'application/zip');
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/generation-task-downloads/file/:id', (req, res) => {
    try {
      const file = getTemporaryBinaryDownload(String(req.params.id ?? ''));
      if (!file) {
        res.status(404).json({ error: { message: 'Temporary file not found or expired.' } });
        return;
      }
      sendBinaryDownloadResponse(res, file.buffer, file.filename, file.mediaType);
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
