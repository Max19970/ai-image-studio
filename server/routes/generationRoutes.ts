import type express from 'express';
import type multer from 'multer';
import { getProviderAdapter, parseProviderSettings } from '../providers/registry';
import {
  normalizePayload,
  type ProviderSubmitTransportDefinition,
  type UploadedFile
} from '../providers/types';
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

function parseJsonField(value: unknown, fallback: unknown): unknown {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (!['{', '[', '"'].includes(trimmed[0]) && !['null', 'true', 'false'].includes(trimmed)) return value;
  return JSON.parse(trimmed);
}

function parseProviderModeId(value: unknown): string | null {
  const parsed = parseJsonField(value, null);
  return typeof parsed === 'string' && parsed.trim() ? parsed.trim() : null;
}

function parseTransport(value: unknown): ProviderSubmitTransportDefinition | null {
  const parsed = parseJsonField(value, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Partial<ProviderSubmitTransportDefinition>;
  if (record.kind !== 'json' && record.kind !== 'multipart') return null;
  if (record.operation !== 'generate' && record.operation !== 'edit' && record.operation !== 'provider-submit') return null;
  return {
    kind: record.kind,
    operation: record.operation,
    path: typeof record.path === 'string' ? record.path : undefined
  };
}

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
      signal: createRequestAbortSignal(req, res)
    }
  });
  await proxyResponse(upstream, res);
}

export function registerGenerationRoutes(app: express.Express, upload: multer.Multer) {
  app.post('/api/provider/submit', upload.any(), async (req, res) => {
    try {
      await submitProviderModeRequest(req, res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

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
