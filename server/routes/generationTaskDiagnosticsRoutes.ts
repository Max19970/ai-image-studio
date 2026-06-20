import type express from 'express';
import { auditGenerationTaskStorageDocuments } from '../storage/generationTaskStore';
import { sendServerError } from '../http/errors';

export function registerGenerationTaskDiagnosticsRoutes(app: express.Express) {
  app.get('/api/storage/generation-tasks/audit', (_req, res) => {
    try {
      res.json(auditGenerationTaskStorageDocuments());
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
