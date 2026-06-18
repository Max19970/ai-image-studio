import type express from 'express';
import type multer from 'multer';
import { getProviderAdapter } from '../providers/registry';
import { ProviderSchema, normalizePayload, type UploadedFile } from '../providers/types';
import { proxyResponse, sendServerError } from '../http/errors';

export function registerGenerationRoutes(app: express.Express, upload: multer.Multer) {
  app.post('/api/generate', async (req, res) => {
    try {
      const provider = ProviderSchema.parse(req.body.provider ?? {});
      const payload = normalizePayload(req.body.payload);
      const { upstream } = await getProviderAdapter(provider.adapterId).fetchGenerate(provider, payload);
      await proxyResponse(upstream, res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/edit', upload.any(), async (req, res) => {
    try {
      const provider = ProviderSchema.parse(JSON.parse(String(req.body.provider ?? '{}')));
      const payload = normalizePayload(JSON.parse(String(req.body.payload ?? '{}')));
      const files = (req.files ?? []) as UploadedFile[];
      const { upstream } = await getProviderAdapter(provider.adapterId).fetchEdit(provider, payload, files);
      await proxyResponse(upstream, res);
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
