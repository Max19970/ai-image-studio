import type express from 'express';
import type multer from 'multer';
import type { BackendAppContext } from '../appContext';
import { listBackendRouteGroups } from './registry';

export function registerApiRoutes(app: express.Express, upload: multer.Multer, context: BackendAppContext) {
  const routeContext = { ...context, upload };
  for (const group of listBackendRouteGroups()) {
    group.register(app, routeContext);
  }
}
