import type express from 'express';
import type multer from 'multer';
import { registerAppDocumentStorageRoutes } from './appDocumentStorageRoutes';
import { registerDefaultRoutes } from './defaultRoutes';
import { registerGenerationRoutes } from './generationRoutes';
import { registerGenerationTaskStorageRoutes } from './generationTaskStorageRoutes';
import { registerIntegrationRoutes } from './integrationRoutes';
import { registerProviderRoutes } from './providerRoutes';
import { registerTelegramMiniAppRoutes } from './telegramMiniAppRoutes';

export function registerApiRoutes(app: express.Express, upload: multer.Multer) {
  registerGenerationRoutes(app, upload);
  registerProviderRoutes(app);
  registerGenerationTaskStorageRoutes(app);
  registerAppDocumentStorageRoutes(app);
  registerIntegrationRoutes(app);
  registerTelegramMiniAppRoutes(app);
  registerDefaultRoutes(app);
}
