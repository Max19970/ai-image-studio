import type express from 'express';
import type multer from 'multer';
import type { BackendAppContext } from '../appContext';

export interface BackendRouteContext extends BackendAppContext {
  upload: multer.Multer;
}

export interface BackendRouteGroup {
  id: string;
  register(app: express.Express, context: BackendRouteContext): void;
}
