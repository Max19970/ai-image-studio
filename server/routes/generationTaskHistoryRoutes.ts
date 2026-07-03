import type express from 'express';
import {
  clearGenerationTaskHistoryDocuments,
  getGenerationTaskStorageDiagnostics,
  loadGenerationTaskHistoryDocuments,
  saveGenerationTaskHistoryDocuments
} from '../storage/generationTaskStore';
import { sendServerError } from '../http/errors';
import { serializeGenerationTaskHistoryForClient } from '../processes/generationTaskHistoryClientSerialization';

export function registerGenerationTaskHistoryRoutes(app: express.Express) {
  app.get('/api/storage/generation-tasks/diagnostics', (_req, res) => {
    try {
      res.json(getGenerationTaskStorageDiagnostics());
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/generation-tasks', (req, res) => {
    try {
      const limit = Number(req.query.limit ?? 1000);
      const offset = Number(req.query.offset ?? 0);
      const assetMode = req.query.assetMode === 'thumbnail' || req.query.assetMode === 'metadata' ? req.query.assetMode : 'full';
      const loadAssetMode = assetMode === 'thumbnail' ? 'metadata' : assetMode;
      const { tasks, stats } = loadGenerationTaskHistoryDocuments({ limit, offset, assetMode: loadAssetMode });
      res.json({ tasks: serializeGenerationTaskHistoryForClient(tasks, assetMode), storage: stats, pagination: { limit, offset, assetMode } });
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
