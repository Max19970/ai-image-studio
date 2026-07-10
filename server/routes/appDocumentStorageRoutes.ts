import type express from 'express';
import {
  deleteAppDocument,
  loadAppDocument,
  saveAppDocument,
  type AppDocumentStorageStats
} from '../storage/appDocumentStore';
import { listAppDocumentRouteDescriptors, type AppDocumentRouteDescriptor } from '../storage/appDocumentDescriptors';
import { sendServerError } from '../http/errors';

function registerAppDocumentRoute<T>(app: express.Express, descriptor: AppDocumentRouteDescriptor<T>) {
  app.get(descriptor.route, (_req, res) => {
    try {
      res.json(loadAppDocument(descriptor.bucket, descriptor.documentKey, descriptor.fallback));
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.put(descriptor.route, (req, res) => {
    try {
      const storage = saveAppDocument(descriptor.bucket, descriptor.documentKey, req.body?.[descriptor.requestKey] ?? descriptor.fallback);
      res.json({ ok: true, storage });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  if (descriptor.allowDelete) registerAppDocumentDeleteRoute(app, descriptor.route, () => deleteAppDocument(descriptor.bucket, descriptor.documentKey));
}

function registerAppDocumentDeleteRoute(
  app: express.Express,
  route: string,
  deleteDocument: () => AppDocumentStorageStats
) {
  app.delete(route, (_req, res) => {
    try {
      const storage = deleteDocument();
      res.json({ ok: true, storage });
    } catch (error) {
      sendServerError(res, error);
    }
  });
}

export function registerAppDocumentStorageRoutes(app: express.Express) {
  for (const descriptor of listAppDocumentRouteDescriptors()) {
    registerAppDocumentRoute(app, descriptor);
  }
}
