import type express from 'express';
import { normalizeGalleryPath } from '../../../src/domain/galleryFilesystem';
import { parseProviderSettings } from '../../providers/registry';
import {
  normalizePayload,
  type ProviderPreviewStreamMode,
  type ProviderSubmitTransportDefinition,
  type UploadedFile
} from '../../providers/types';

export function createRequestAbortSignal(req: express.Request, res: express.Response): AbortSignal {
  const controller = new AbortController();
  const abort = () => {
    if (!res.writableEnded) controller.abort(new Error('Client disconnected.'));
  };
  req.on('aborted', abort);
  res.on('close', abort);
  return controller.signal;
}

export function parseJsonField(value: unknown, fallback: unknown): unknown {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (!['{', '[', '"'].includes(trimmed[0]) && !['null', 'true', 'false'].includes(trimmed)) return value;
  return JSON.parse(trimmed);
}

export function parseProviderModeId(value: unknown): string | null {
  const parsed = parseJsonField(value, null);
  return typeof parsed === 'string' && parsed.trim() ? parsed.trim() : null;
}

export function parseSnapshot(value: unknown) {
  const parsed = parseJsonField(value, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Generation task snapshot is required.');
  }
  return parsed as any;
}

export function parseTransport(value: unknown): ProviderSubmitTransportDefinition | null {
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

export function parseGalleryPath(value: unknown): string {
  return normalizeGalleryPath(parseJsonField(value, '/'));
}

export function parsePreviewStreamMode(value: unknown): ProviderPreviewStreamMode | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'full' || normalized === 'throttled' || normalized === 'off') return normalized;
  return null;
}

export function resolvePreviewStreamMode(req: express.Request): ProviderPreviewStreamMode {
  return parsePreviewStreamMode(req.get('x-image-studio-comfyui-preview-stream')) ?? 'throttled';
}

export function numericField(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function batchFiles(files: UploadedFile[], index: number): UploadedFile[] {
  const prefix = `item_${index}_`;
  return files
    .filter((file) => file.fieldname.startsWith(prefix))
    .map((file) => ({ ...file, fieldname: file.fieldname.slice(prefix.length) }));
}

export function parseSingleGenerationRunRequest(req: express.Request) {
  return {
    provider: parseProviderSettings(parseJsonField(req.body.provider, {})),
    payload: normalizePayload(parseJsonField(req.body.payload, {})),
    files: (req.files ?? []) as UploadedFile[],
    providerModeId: parseProviderModeId(req.body.providerModeId),
    transport: parseTransport(req.body.transport),
    snapshot: parseSnapshot(req.body.snapshot),
    galleryPath: parseGalleryPath(req.body.galleryPath),
    previewStreamMode: resolvePreviewStreamMode(req),
    retryAttempts: numericField(req.body.retryAttempts, 0),
    retryDelaySeconds: numericField(req.body.retryDelaySeconds, 0)
  };
}

export function parseBatchItems(req: express.Request) {
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
      retryDelaySeconds: numericField(item.retryDelaySeconds, 0),
      galleryPath: parseGalleryPath(req.body.galleryPath)
    };
  });
}

export function parseBatchGenerationRunRequest(req: express.Request) {
  return {
    items: parseBatchItems(req),
    intervalMs: numericField(parseJsonField(req.body.intervalMs, 0), 0),
    aggregateSnapshot: parseJsonField(req.body.aggregateSnapshot, null) as any,
    galleryPath: parseGalleryPath(req.body.galleryPath)
  };
}
