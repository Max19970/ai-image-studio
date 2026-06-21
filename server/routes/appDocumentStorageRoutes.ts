import type express from 'express';
import {
  currentDocumentKey,
  deleteAppDocument,
  imageParamsBucket,
  loadAppDocument,
  providerProbeCacheBucket,
  requestPresetsBucket,
  saveAppDocument,
  studioSettingsBucket
} from '../storage/appDocumentStore';
import { sendServerError } from '../http/errors';

function registerAppDocumentRoute<T>(
  app: express.Express,
  route: string,
  bucket: string,
  requestKey: string,
  fallback: T
) {
  app.get(route, (_req, res) => {
    try {
      res.json(loadAppDocument(bucket, currentDocumentKey, fallback));
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.put(route, (req, res) => {
    try {
      const storage = saveAppDocument(bucket, currentDocumentKey, req.body?.[requestKey] ?? fallback);
      res.json({ ok: true, storage });
    } catch (error) {
      sendServerError(res, error);
    }
  });
}

export function registerAppDocumentStorageRoutes(app: express.Express) {
  registerAppDocumentRoute(app, '/api/storage/studio-settings', studioSettingsBucket, 'settings', null);
  registerAppDocumentRoute(app, '/api/storage/image-params', imageParamsBucket, 'params', null);
  registerAppDocumentRoute(app, '/api/storage/request-presets', requestPresetsBucket, 'presets', []);
  registerAppDocumentRoute(app, '/api/storage/provider-probe-cache', providerProbeCacheBucket, 'cache', {});

  app.delete('/api/storage/provider-probe-cache', (_req, res) => {
    try {
      const storage = deleteAppDocument(providerProbeCacheBucket, currentDocumentKey);
      res.json({ ok: true, storage });
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
