import type express from 'express';
import type multer from 'multer';
import { getProviderAdapter, parseProviderSettings } from '../providers/registry';
import { normalizePayload, type UploadedFile } from '../providers/types';
import { proxyResponse, sendServerError } from '../http/errors';

function createRequestAbortSignal(req: express.Request, res: express.Response): AbortSignal {
  const controller = new AbortController();
  const abort = () => {
    if (!res.writableEnded) controller.abort(new Error('Client disconnected.'));
  };
  req.on('aborted', abort);
  res.on('close', abort);
  return controller.signal;
}

export function registerGenerationRoutes(app: express.Express, upload: multer.Multer) {
  app.post('/api/generate', async (req, res) => {
    try {
      const provider = parseProviderSettings(req.body.provider ?? {});
      const payload = normalizePayload(req.body.payload);
      const { upstream } = await getProviderAdapter(provider.adapterId).fetchGenerate(provider, payload, {
        signal: createRequestAbortSignal(req, res)
      });
      await proxyResponse(upstream, res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/edit', upload.any(), async (req, res) => {
    try {
      const provider = parseProviderSettings(JSON.parse(String(req.body.provider ?? '{}')));
      const payload = normalizePayload(JSON.parse(String(req.body.payload ?? '{}')));
      const files = (req.files ?? []) as UploadedFile[];
      const { upstream } = await getProviderAdapter(provider.adapterId).fetchEdit(provider, payload, files, {
        signal: createRequestAbortSignal(req, res)
      });
      await proxyResponse(upstream, res);
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
