import type express from 'express';
import { auditGenerationTaskStorageDocumentsAsync } from '../storage/generationTaskStoreAsync';
import { sendServerError } from '../http/errors';

export function registerGenerationTaskDiagnosticsRoutes(app: express.Express) {
  app.get('/api/storage/generation-tasks/audit', async (_req, res) => {
    try {
      res.json(await auditGenerationTaskStorageDocumentsAsync());
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
