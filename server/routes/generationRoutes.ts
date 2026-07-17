import type express from 'express';
import type multer from 'multer';
import type { GenerationTaskRuntimePort } from '../processes/generation-task-runtime/runtimePort';
import { registerGenerationTaskRoutes } from './generation/taskRoutes';
import { registerLegacyGenerationProxyRoutes, registerProviderSubmitRoutes } from './generation/providerSubmitRoutes';
import { registerLiveGenerationImageRoutes } from './generation/liveImageRoutes';

export function registerGenerationRoutes(
  app: express.Express,
  upload: multer.Multer,
  generationTasks: GenerationTaskRuntimePort
) {
  registerLiveGenerationImageRoutes(app);
  registerGenerationTaskRoutes(app, upload, generationTasks);
  registerProviderSubmitRoutes(app, upload);
  registerLegacyGenerationProxyRoutes(app, upload);
}
