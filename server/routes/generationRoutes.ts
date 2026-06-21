import type express from 'express';
import type multer from 'multer';
import { getProviderAdapter, parseProviderSettings } from '../providers/registry';
import {
  normalizePayload,
  type ProviderPreviewStreamMode,
  type ProviderSubmitTransportDefinition,
  type UploadedFile
} from '../providers/types';
import { proxyResponse, sendServerError } from '../http/errors';
import {
  cancelServerGenerationTask,
  clearServerGenerationTasks,
  deleteServerGenerationTask,
  startServerBatchGenerationRun,
  startServerGenerationRun,
  subscribeGenerationTaskEvents
} from '../processes/generationTaskRuntime';

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

function parseSnapshot(value: unknown) {
  const parsed = parseJsonField(value, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Generation task snapshot is required.');
  }
  return parsed as any;
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

function parsePreviewStreamMode(value: unknown): ProviderPreviewStreamMode | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'full' || normalized === 'throttled' || normalized === 'off') return normalized;
  return null;
}

function resolvePreviewStreamMode(req: express.Request): ProviderPreviewStreamMode {
  return parsePreviewStreamMode(req.get('x-image-studio-comfyui-preview-stream')) ?? 'throttled';
}

function numericField(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function batchFiles(files: UploadedFile[], index: number): UploadedFile[] {
  const prefix = `item_${index}_`;
  return files
    .filter((file) => file.fieldname.startsWith(prefix))
    .map((file) => ({ ...file, fieldname: file.fieldname.slice(prefix.length) }));
}

function parseBatchItems(req: express.Request) {
  const records = parseJsonField(req.body.items, []);
  if (!Array.isArray(records)) throw new Error('Batch items must be an array.');
  const files = (req.files ?? []) as UploadedFile[];
  return records.map((record, index) => {
    const item = record && typeof record === 'object' && !Array.isArray(record) ? record as Record<string, unknown> : {};
    return {
      provider: parseProviderSettings(item.provider),
      payload: normalizePayload(item.payload),
      files: batchFiles(files, index),
      providerModeId: typeof item.providerModeId === 'string' ? item.providerModeId : null,
      transport: parseTransport(item.transport),
      snapshot: parseSnapshot(item.snapshot),
      previewStreamMode: resolvePreviewStreamMode(req),
      retryAttempts: numericField(item.retryAttempts, 0),
      retryDelaySeconds: numericField(item.retryDelaySeconds, 0)
    };
  });
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
      signal: createRequestAbortSignal(req, res),
      previewStreamMode: resolvePreviewStreamMode(req)
    }
  });
  await proxyResponse(upstream, res);
}

export function registerGenerationRoutes(app: express.Express, upload: multer.Multer) {
  app.get('/api/generation-tasks/events', (req, res) => {
    try {
      subscribeGenerationTaskEvents(req, res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/generation-tasks/run', upload.any(), async (req, res) => {
    try {
      const provider = parseProviderSettings(parseJsonField(req.body.provider, {}));
      const payload = normalizePayload(parseJsonField(req.body.payload, {}));
      const files = (req.files ?? []) as UploadedFile[];
      const providerModeId = parseProviderModeId(req.body.providerModeId);
      const transport = parseTransport(req.body.transport);
      const snapshot = parseSnapshot(req.body.snapshot);
      const task = await startServerGenerationRun({
        provider,
        payload,
        files,
        providerModeId,
        transport,
        snapshot,
        previewStreamMode: resolvePreviewStreamMode(req)
      });
      res.status(202).json({ taskId: task.id, task });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/generation-tasks/batch', upload.any(), async (req, res) => {
    try {
      const task = await startServerBatchGenerationRun({
        items: parseBatchItems(req),
        intervalMs: numericField(parseJsonField(req.body.intervalMs, 0), 0),
        aggregateSnapshot: parseJsonField(req.body.aggregateSnapshot, null) as any
      });
      res.status(202).json({ taskId: task.id, task });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/generation-tasks/clear', async (_req, res) => {
    try {
      await clearServerGenerationTasks();
      res.status(204).end();
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/generation-tasks/delete', async (req, res) => {
    try {
      const taskId = typeof req.body?.taskId === 'string' ? req.body.taskId : '';
      await deleteServerGenerationTask(taskId);
      res.status(204).end();
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.delete('/api/generation-tasks', async (_req, res) => {
    try {
      await clearServerGenerationTasks();
      res.status(204).end();
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.delete('/api/generation-tasks/:taskId', async (req, res) => {
    try {
      await deleteServerGenerationTask(req.params.taskId);
      res.status(204).end();
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post('/api/generation-tasks/:taskId/cancel', async (req, res) => {
    try {
      await cancelServerGenerationTask(req.params.taskId);
      res.status(204).end();
    } catch (error) {
      sendServerError(res, error);
    }
  });

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
