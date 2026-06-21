import type express from 'express';
import { registerGenerationTaskAssetRoutes } from './generationTaskAssetRoutes';
import { registerGenerationTaskDiagnosticsRoutes } from './generationTaskDiagnosticsRoutes';
import { registerGenerationTaskDownloadRoutes } from './generationTaskDownloadRoutes';
import { registerGenerationTaskHistoryRoutes } from './generationTaskHistoryRoutes';
import { registerGalleryFolderRoutes } from './galleryFolderRoutes';

export function registerGenerationTaskStorageRoutes(app: express.Express) {
  registerGenerationTaskDiagnosticsRoutes(app);
  registerGenerationTaskHistoryRoutes(app);
  registerGalleryFolderRoutes(app);
  registerGenerationTaskAssetRoutes(app);
  registerGenerationTaskDownloadRoutes(app);
}
