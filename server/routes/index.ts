import type express from 'express';
import type multer from 'multer';
import { registerAppDocumentStorageRoutes } from './appDocumentStorageRoutes';
import { registerDefaultRoutes } from './defaultRoutes';
import { registerGenerationRoutes } from './generationRoutes';
import { registerGenerationTaskStorageRoutes } from './generationTaskStorageRoutes';
import { registerProviderRoutes } from './providerRoutes';

export function registerApiRoutes(app: express.Express, upload: multer.Multer) {
  registerGenerationRoutes(app, upload);
  registerProviderRoutes(app);
  registerGenerationTaskStorageRoutes(app);
  registerAppDocumentStorageRoutes(app);
  registerDefaultRoutes(app);
}
