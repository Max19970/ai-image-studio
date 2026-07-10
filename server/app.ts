import express from 'express';
import multer from 'multer';
import { createBackendAppContext, type BackendAppContext } from './appContext';
import { createCorsMiddleware } from './http/cors';
import { registerApiRoutes } from './routes';

export function createImageStudioApp(context: BackendAppContext = createBackendAppContext()) {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 18 } });

  app.use('/api', createCorsMiddleware());
  app.use(express.json({ limit: process.env.IMAGE_STUDIO_JSON_LIMIT || '256mb' }));

  registerApiRoutes(app, upload, context);
  return app;
}
