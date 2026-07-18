import type express from 'express';
import { registerGenerationTaskAssetRoutes } from './generationTaskAssetRoutes';
import { registerGenerationTaskDiagnosticsRoutes } from './generationTaskDiagnosticsRoutes';
import { registerGenerationTaskDownloadRoutes } from './generationTaskDownloadRoutes';
import { registerGenerationTaskHistoryRoutes } from './generationTaskHistoryRoutes';
import { registerGalleryFolderRoutes } from './galleryFolderRoutes';
import type { GenerationTaskRuntimePort } from '../processes/generation-task-runtime/runtimePort';
import type { GalleryCatalog } from '../gallery/catalog';

export function registerGenerationTaskStorageRoutes(
  app: express.Express,
  generationTasks: GenerationTaskRuntimePort,
  galleryCatalog: GalleryCatalog
) {
  registerGenerationTaskDiagnosticsRoutes(app);
  registerGenerationTaskHistoryRoutes(app);
  registerGalleryFolderRoutes(app, galleryCatalog);
  registerGenerationTaskAssetRoutes(app);
  registerGenerationTaskDownloadRoutes(app);
}
