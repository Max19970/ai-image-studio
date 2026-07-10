import type express from 'express';
import {
  clearGenerationTaskHistoryDocumentsAsync,
  getGenerationTaskStorageDiagnosticsAsync,
  loadGenerationTaskHistoryDocumentsAsync,
  saveGenerationTaskHistoryDocumentsAsync
} from '../storage/generationTaskStoreAsync';
import { sendServerError } from '../http/errors';
import { serializeGenerationTaskHistoryForClient } from '../processes/generationTaskHistoryClientSerialization';

export function registerGenerationTaskHistoryRoutes(app: express.Express) {
  app.get('/api/storage/generation-tasks/diagnostics', async (_req, res) => {
    try {
      res.json(await getGenerationTaskStorageDiagnosticsAsync());
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.get('/api/storage/generation-tasks', async (req, res) => {
    try {
      const limit = Number(req.query.limit ?? 1000);
      const offset = Number(req.query.offset ?? 0);
      const assetMode = req.query.assetMode === 'thumbnail' || req.query.assetMode === 'metadata' ? req.query.assetMode : 'full';
      const loadAssetMode = assetMode === 'thumbnail' ? 'metadata' : assetMode;
      const { tasks, stats } = await loadGenerationTaskHistoryDocumentsAsync({ limit, offset, assetMode: loadAssetMode });
      res.json({ tasks: serializeGenerationTaskHistoryForClient(tasks, assetMode), storage: stats, pagination: { limit, offset, assetMode } });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.put('/api/storage/generation-tasks', async (req, res) => {
    try {
      const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
      const stats = await saveGenerationTaskHistoryDocumentsAsync(tasks);
      res.json({ ok: true, count: tasks.length, storage: stats });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.delete('/api/storage/generation-tasks', async (_req, res) => {
    try {
      const stats = await clearGenerationTaskHistoryDocumentsAsync();
      res.json({ ok: true, count: 0, storage: stats });
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
