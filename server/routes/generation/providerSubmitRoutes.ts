import type express from 'express';
import type multer from 'multer';
import { proxyResponse, sendServerError } from '../../http/errors';
import { getProviderAdapter, parseProviderSettings } from '../../providers/registry';
import { normalizePayload } from '../../providers/requestValidation';
import type { ProviderSubmitTransportDefinition, UploadedFile } from '../../providers/types';
import {
  createRequestAbortSignal,
  parseJsonField,
  parseProviderModeId,
  parseTransport,
  resolvePreviewStreamMode
} from './requestParsing';

async function submitProviderModeRequest(
  req: express.Request,
  res: express.Response,
  legacyTransport: ProviderSubmitTransportDefinition | null = null
) {
  const provider = parseProviderSettings(parseJsonField(req.body.provider, {}));
  const payload = normalizePayload(parseJsonField(req.body.payload, {}));
  const files = (req.files ?? []) as UploadedFile[];
  const providerModeId = parseProviderModeId(req.body.providerModeId);
  const transport = parseTransport(req.body.transport) ?? legacyTransport;
  const { upstream } = await getProviderAdapter(provider.adapterId).submitProviderMode({
    provider,
    providerModeId,
    transport,
    payload,
    files,
    context: {
      signal: createRequestAbortSignal(req, res),
      previewStreamMode: resolvePreviewStreamMode(req)
    }
  });
  await proxyResponse(upstream, res);
}

export function registerProviderSubmitRoutes(app: express.Express, upload: multer.Multer) {
  app.post('/api/provider/submit', upload.any(), async (req, res) => {
    try {
      await submitProviderModeRequest(req, res);
    } catch (error) {
      sendServerError(res, error);
    }
  });
}

export function registerLegacyGenerationProxyRoutes(app: express.Express, upload: multer.Multer) {
  app.post('/api/generate', async (req, res) => {
    try {
      await submitProviderModeRequest(req, res, { kind: 'json', operation: 'generate', path: '/api/generate' });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/edit', upload.any(), async (req, res) => {
    try {
      await submitProviderModeRequest(req, res, { kind: 'multipart', operation: 'edit', path: '/api/edit' });
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
