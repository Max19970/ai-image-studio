import type express from 'express';
import type multer from 'multer';
import { registerGenerationTaskRoutes } from './generation/taskRoutes';
import { registerLegacyGenerationProxyRoutes, registerProviderSubmitRoutes } from './generation/providerSubmitRoutes';
import { registerLiveGenerationImageRoutes } from './generation/liveImageRoutes';

export function registerGenerationRoutes(app: express.Express, upload: multer.Multer) {
  registerLiveGenerationImageRoutes(app);
  registerGenerationTaskRoutes(app, upload);
  registerProviderSubmitRoutes(app, upload);
  registerLegacyGenerationProxyRoutes(app, upload);
}
