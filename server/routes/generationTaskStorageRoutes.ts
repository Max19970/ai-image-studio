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
