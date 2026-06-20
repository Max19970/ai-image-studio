import type express from 'express';
import { registerGenerationTaskAssetRoutes } from './generationTaskAssetRoutes';
import { registerGenerationTaskDiagnosticsRoutes } from './generationTaskDiagnosticsRoutes';
import { registerGenerationTaskDownloadRoutes } from './generationTaskDownloadRoutes';
import { registerGenerationTaskHistoryRoutes } from './generationTaskHistoryRoutes';

export function registerGenerationTaskStorageRoutes(app: express.Express) {
  registerGenerationTaskDiagnosticsRoutes(app);
  registerGenerationTaskHistoryRoutes(app);
  registerGenerationTaskAssetRoutes(app);
  registerGenerationTaskDownloadRoutes(app);
}
