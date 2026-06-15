import cors from 'cors';
import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024, files: 18 } });

function allowedCorsOrigins(): Set<string> {
  return new Set(
    env('IMAGE_STUDIO_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedCorsOrigins().has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin is not allowed by Image Studio: ${origin}`));
  }
}));
app.use(express.json({ limit: process.env.IMAGE_STUDIO_JSON_LIMIT || '256mb' }));


const dataDir = path.resolve(__dirname, '..', 'data');
const storageDbPath = env('IMAGE_STUDIO_DB_PATH', path.join(dataDir, 'image-studio.sqlite'));
const storageKeyPath = env('IMAGE_STUDIO_STORAGE_KEY_FILE', path.join(dataDir, 'storage.key'));
const historyBlobKey = 'generation-tasks.v1';

let storageDb: DatabaseSync | null = null;
let storageKey: Buffer | null = null;

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getStorageKey(): Buffer {
  if (storageKey) return storageKey;

  const envKey = env('IMAGE_STUDIO_STORAGE_KEY').trim();
  if (envKey) {
    const decoded = Buffer.from(envKey, /^[0-9a-f]{64}$/i.test(envKey) ? 'hex' : 'base64');
    if (decoded.length !== 32) throw new Error('IMAGE_STUDIO_STORAGE_KEY must decode to exactly 32 bytes.');
    storageKey = decoded;
    return storageKey;
  }

  ensureDataDir();
  if (!fs.existsSync(storageKeyPath)) {
    const generated = crypto.randomBytes(32).toString('base64');
    fs.writeFileSync(storageKeyPath, generated, { mode: 0o600 });
  }
  const fileKey = fs.readFileSync(storageKeyPath, 'utf8').trim();
  const decoded = Buffer.from(fileKey, 'base64');
  if (decoded.length !== 32) throw new Error(`Storage key at ${storageKeyPath} is invalid.`);
  storageKey = decoded;
  return storageKey;
}

function getStorageDb(): DatabaseSync {
  if (storageDb) return storageDb;
  ensureDataDir();
  storageDb = new DatabaseSync(storageDbPath);
  storageDb.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS encrypted_blobs (
      key TEXT PRIMARY KEY,
      value BLOB NOT NULL,
      updated_at INTEGER NOT NULL,
      compressed_bytes INTEGER NOT NULL,
      encrypted_bytes INTEGER NOT NULL
    );
  `);
  return storageDb;
}

function encryptJson(value: unknown): Buffer {
  const json = Buffer.from(JSON.stringify(value), 'utf8');
  const compressed = zlib.brotliCompressSync(json, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 6
    }
  });
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getStorageKey(), iv);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, tag, encrypted]);
}

function decryptJson<T>(blob: Buffer, fallback: T): T {
  try {
    if (!blob.length || blob[0] !== 1) return fallback;
    const iv = blob.subarray(1, 13);
    const tag = blob.subarray(13, 29);
    const encrypted = blob.subarray(29);
    const decipher = crypto.createDecipheriv('aes-256-gcm', getStorageKey(), iv);
    decipher.setAuthTag(tag);
    const compressed = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const json = zlib.brotliDecompressSync(compressed).toString('utf8');
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('[storage] Failed to decrypt stored payload:', error);
    return fallback;
  }
}

function saveEncryptedBlob(key: string, value: unknown) {
  const encrypted = encryptJson(value);
  const compressedBytes = zlib.brotliCompressSync(Buffer.from(JSON.stringify(value), 'utf8'), {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 }
  }).length;
  getStorageDb()
    .prepare('INSERT OR REPLACE INTO encrypted_blobs (key, value, updated_at, compressed_bytes, encrypted_bytes) VALUES (?, ?, ?, ?, ?)')
    .run(key, encrypted, Date.now(), compressedBytes, encrypted.length);
  return { compressedBytes, encryptedBytes: encrypted.length };
}

function loadEncryptedBlob<T>(key: string, fallback: T): T {
  const row = getStorageDb().prepare('SELECT value FROM encrypted_blobs WHERE key = ?').get(key) as { value?: Buffer } | undefined;
  if (!row?.value) return fallback;
  return decryptJson(row.value, fallback);
}

const ProviderSchema = z.object({
  generationEndpoint: z.string().url().optional(),
  editEndpoint: z.string().url().optional(),
  responsesEndpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
  modelId: z.string().optional(),
  authHeaderName: z.string().default('Authorization'),
  authScheme: z.string().default('Bearer'),
  customHeadersJson: z.string().optional(),
  timeoutMs: z.number().int().min(1_000).max(900_000).default(240_000),
  persistApiKey: z.boolean().optional()
});

type ProviderSettings = z.infer<typeof ProviderSchema>;
type UploadedFile = Express.Multer.File;

class HttpError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

type ProbeStatus = 'accepted' | 'rejected' | 'error' | 'unknown';

type ProbeEntry = {
  supported: boolean;
  status: ProbeStatus;
  message?: string;
  testedValue?: unknown;
};

type ProbeReport = {
  fingerprint: string;
  createdAt: number;
  providerLabel: string;
  caveat?: string;
  baseline: {
    generation: ProbeEntry;
    edit: ProbeEntry;
    unknownParamControlGeneration?: ProbeEntry;
    unknownParamControlEdit?: ProbeEntry;
  };
  generation: Record<string, ProbeEntry>;
  edit: Record<string, ProbeEntry>;
};

function env(name: string, fallback = ''): string {
  return process.env[name] || fallback;
}

function resolveEndpoint(provider: ProviderSettings, kind: 'generate' | 'edit'): string {
  const fromProvider = kind === 'generate' ? provider.generationEndpoint : provider.editEndpoint;
  const fallback = kind === 'generate'
    ? env('DEFAULT_GENERATION_ENDPOINT', 'https://api.openai.com/v1/images/generations')
    : env('DEFAULT_EDIT_ENDPOINT', 'https://api.openai.com/v1/images/edits');
  const endpoint = fromProvider || fallback;
  const url = new URL(endpoint);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP/HTTPS endpoints are allowed.');
  return url.toString();
}

function getProviderApiKey(provider: ProviderSettings): string {
  const key = (provider.apiKey || env('OPENAI_API_KEY') || '').trim();
  if (!key) return '';
  if ([...key].some((ch) => ch.charCodeAt(0) > 127)) {
    throw new Error('API key contains non-ASCII characters. Use the real provider key, not a placeholder with кириллица.');
  }
  return key;
}

function buildHeaders(provider: ProviderSettings, isMultipart = false): Headers {
  const headers = new Headers();
  if (!isMultipart) headers.set('Content-Type', 'application/json');

  const key = getProviderApiKey(provider);
  if (key) {
    const headerName = provider.authHeaderName || 'Authorization';
    const scheme = provider.authScheme?.trim();
    headers.set(headerName, scheme ? `${scheme} ${key}` : key);
  }

  const custom = provider.customHeadersJson?.trim();
  if (custom) {
    const parsed = JSON.parse(custom) as Record<string, string>;
    Object.entries(parsed).forEach(([header, value]) => headers.set(header, String(value)));
  }

  return headers;
}

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref();
  return controller.signal;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function proxyResponse(upstream: Response, res: express.Response) {
  const contentType = upstream.headers.get('content-type') || '';
  res.status(upstream.status);

  if (contentType.includes('text/event-stream')) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
  } else {
    res.setHeader('Content-Type', contentType || 'application/json; charset=utf-8');
  }

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

function normalizePayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Payload must be a JSON object.');
  }
  return payload as Record<string, unknown>;
}

function validatePromptPayload(payload: Record<string, unknown>) {
  if (typeof payload.prompt !== 'string' || payload.prompt.trim().length === 0) {
    throw new HttpError('Prompt is required before sending the image request.', 400);
  }
}

function imageFilesForEdit(files: UploadedFile[]) {
  return files.filter((file) => ['image_target', 'image_reference', 'image'].includes(file.fieldname));
}

function validateEditFiles(files: UploadedFile[]) {
  const images = imageFilesForEdit(files);
  if (images.length === 0) {
    throw new HttpError('Edit request requires at least one image attachment.', 400);
  }
}

function formValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

function appendEditPayload(form: FormData, payload: Record<string, unknown>, files: UploadedFile[]) {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, formValue(value));
  });

  const target = files.find((file) => file.fieldname === 'image_target') ?? files.find((file) => file.fieldname === 'image');
  const refs = files.filter((file) => file.fieldname === 'image_reference');
  const legacyImages = files.filter((file) => file.fieldname === 'image').filter((file) => file !== target);

  if (target) {
    form.append('image', new Blob([new Uint8Array(target.buffer)], { type: target.mimetype || 'application/octet-stream' }), target.originalname);
  }

  [...refs, ...legacyImages].forEach((file) => {
    form.append('image', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype || 'application/octet-stream' }), file.originalname);
  });

  const mask = files.find((file) => file.fieldname === 'mask');
  if (mask) {
    form.append('mask', new Blob([new Uint8Array(mask.buffer)], { type: mask.mimetype || 'image/png' }), mask.originalname);
  }
}

function extractMessage(text: string): string {
  try {
    const json = JSON.parse(text);
    if (json?.error?.message) return String(json.error.message);
    if (json?.message) return String(json.message);
  } catch {
    // ignore
  }
  return text.slice(0, 800);
}

function compactCause(error: unknown): string | undefined {
  const anyError = error as any;
  const cause = anyError?.cause;
  const parts: string[] = [];

  if (anyError?.name && anyError.name !== 'Error') parts.push(String(anyError.name));
  if (anyError?.code) parts.push(String(anyError.code));

  if (cause && typeof cause === 'object') {
    if ((cause as any).code) parts.push(String((cause as any).code));
    if ((cause as any).syscall) parts.push(String((cause as any).syscall));
    if ((cause as any).hostname) parts.push(String((cause as any).hostname));
    if ((cause as any).address) parts.push(String((cause as any).address));
    if ((cause as any).port) parts.push(String((cause as any).port));
    if ((cause as any).message) parts.push(String((cause as any).message));
  } else if (typeof cause === 'string') {
    parts.push(cause);
  }

  return [...new Set(parts.filter(Boolean))].join(' · ') || undefined;
}

function describeFetchFailure(error: unknown, endpoint: string): HttpError {
  const anyError = error as any;
  const cause = compactCause(error);
  const timedOut = anyError?.name === 'AbortError';
  const message = timedOut
    ? `Upstream request timed out after the configured timeout: ${endpoint}`
    : `Could not reach upstream image endpoint: ${endpoint}${cause ? ` (${cause})` : ''}`;
  return new HttpError(message, 502);
}

function isRetryableNetworkError(error: unknown): boolean {
  const anyError = error as any;
  const cause = anyError?.cause;
  const code = String(anyError?.code || cause?.code || '');
  return ['UND_ERR_SOCKET', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ECONNREFUSED'].includes(code);
}

async function fetchUpstream(endpoint: string, init: RequestInit, attempts = 2): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(endpoint, init);
    } catch (error) {
      lastError = error;
      if (attempt >= attempts || !isRetryableNetworkError(error)) break;
      await sleep(450 * attempt);
    }
  }
  throw describeFetchFailure(lastError, endpoint);
}

function logOutboundRequest(kind: 'generate' | 'edit', endpoint: string, payload: Record<string, unknown>, files: UploadedFile[] = []) {
  const payloadKeys = Object.keys(payload).sort().join(', ') || 'none';
  const fileSummary = files.length
    ? `${files.length} file(s), ${(files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB`
    : 'no files';
  console.info(`[proxy] ${kind} -> ${endpoint} | payload: ${payloadKeys} | ${fileSummary}`);
}

function sendServerError(res: express.Response, error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  const details = compactCause(error);
  const responseStatus = error instanceof HttpError ? error.statusCode : status;
  res.status(responseStatus).json({ error: details ? { message, details } : { message } });
}

function classifyResult(status: number | null, message: string): ProbeStatus {
  if (status === null) return 'error';
  if (status >= 200 && status < 300) return 'accepted';
  const lower = message.toLowerCase();
  if ([400, 404, 405, 415, 422].includes(status)) {
    if (/(unknown|unsupported|not supported|invalid|unrecognized|extra)/.test(lower)) return 'rejected';
    return 'rejected';
  }
  return 'error';
}

async function readProbeResponse(response: Response, isStream: boolean): Promise<{ status: number; text: string }> {
  if (isStream) {
    const reader = response.body?.getReader();
    let chunks = '';
    if (reader) {
      const decoder = new TextDecoder();
      while (chunks.length < 3000) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks += decoder.decode(value, { stream: true });
        if (chunks.includes('[DONE]')) break;
      }
    }
    return { status: response.status, text: chunks };
  }
  return { status: response.status, text: await response.text() };
}

async function probeJsonCase(provider: ProviderSettings, body: Record<string, unknown>, isStream = false): Promise<ProbeEntry> {
  try {
    const response = await fetchUpstream(resolveEndpoint(provider, 'generate'), {
      method: 'POST',
      headers: buildHeaders(provider),
      body: JSON.stringify(body),
      signal: timeoutSignal(Math.min(provider.timeoutMs, 180_000))
    });

    const { status, text } = await readProbeResponse(response, isStream);
    const message = status >= 200 && status < 300 ? 'OK' : extractMessage(text);
    const verdict = classifyResult(status, message);
    return { supported: verdict === 'accepted', status: verdict, message, testedValue: body };
  } catch (error) {
    return { supported: false, status: 'error', message: error instanceof Error ? error.message : String(error), testedValue: body };
  }
}

async function probeEditCase(provider: ProviderSettings, payload: Record<string, unknown>, includeMask = false, isStream = false): Promise<ProbeEntry> {
  try {
    const form = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      form.append(key, formValue(value));
    });

    const target = makePng(1024, 1024, [255, 255, 255, 255]);
    form.append('image', new Blob([new Uint8Array(target)], { type: 'image/png' }), 'probe-target.png');
    if (includeMask) {
      const mask = makePng(1024, 1024, [0, 0, 0, 0]);
      form.append('mask', new Blob([new Uint8Array(mask)], { type: 'image/png' }), 'probe-mask.png');
    }

    const response = await fetchUpstream(resolveEndpoint(provider, 'edit'), {
      method: 'POST',
      headers: buildHeaders(provider, true),
      body: form,
      signal: timeoutSignal(Math.min(provider.timeoutMs, 180_000))
    });

    const { status, text } = await readProbeResponse(response, isStream);
    const message = status >= 200 && status < 300 ? 'OK' : extractMessage(text);
    const verdict = classifyResult(status, message);
    return { supported: verdict === 'accepted', status: verdict, message, testedValue: payload };
  } catch (error) {
    return { supported: false, status: 'error', message: error instanceof Error ? error.message : String(error), testedValue: payload };
  }
}

function makePng(width: number, height: number, rgba: [number, number, number, number]): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const chunk = (tag: string, data: Buffer) => {
    const tagBuffer = Buffer.from(tag);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcBuffer = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([tagBuffer, data]));
    crcBuffer.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, tagBuffer, data, crcBuffer]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const row = Buffer.alloc(1 + width * 4);
  row[0] = 0;
  for (let x = 0; x < width; x++) {
    const offset = 1 + x * 4;
    row[offset] = rgba[0];
    row[offset + 1] = rgba[1];
    row[offset + 2] = rgba[2];
    row[offset + 3] = rgba[3];
  }

  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function crc32(data: Buffer): number {
  let crc = ~0;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc;
}

function providerFingerprint(provider: ProviderSettings): string {
  return [
    provider.generationEndpoint?.trim() ?? '',
    provider.editEndpoint?.trim() ?? '',
    provider.responsesEndpoint?.trim() ?? '',
    provider.modelId?.trim() ?? '',
    provider.authHeaderName?.trim() ?? '',
    provider.authScheme?.trim() ?? '',
    provider.customHeadersJson?.trim() ?? ''
  ].join('|');
}

app.post('/api/generate', async (req, res) => {
  try {
    const provider = ProviderSchema.parse(req.body.provider ?? {});
    const payload = normalizePayload(req.body.payload);
    validatePromptPayload(payload);
    const endpoint = resolveEndpoint(provider, 'generate');
    logOutboundRequest('generate', endpoint, payload);

    const upstream = await fetchUpstream(endpoint, {
      method: 'POST',
      headers: buildHeaders(provider),
      body: JSON.stringify(payload),
      signal: timeoutSignal(provider.timeoutMs)
    });

    await proxyResponse(upstream, res);
  } catch (error) {
    sendServerError(res, error);
  }
});

app.post('/api/edit', upload.any(), async (req, res) => {
  try {
    const provider = ProviderSchema.parse(JSON.parse(String(req.body.provider ?? '{}')));
    const payload = normalizePayload(JSON.parse(String(req.body.payload ?? '{}')));
    const endpoint = resolveEndpoint(provider, 'edit');
    const files = (req.files ?? []) as UploadedFile[];
    validatePromptPayload(payload);
    validateEditFiles(files);
    logOutboundRequest('edit', endpoint, payload, files);

    const form = new FormData();
    appendEditPayload(form, payload, files);

    const upstream = await fetchUpstream(endpoint, {
      method: 'POST',
      headers: buildHeaders(provider, true),
      body: form,
      signal: timeoutSignal(provider.timeoutMs)
    });

    await proxyResponse(upstream, res);
  } catch (error) {
    sendServerError(res, error);
  }
});


app.post('/api/provider/quick-check', async (req, res) => {
  try {
    const provider = ProviderSchema.parse(req.body.provider ?? {});
    const model = provider.modelId?.trim() || 'gpt-image-2';
    getProviderApiKey(provider);

    const payload = {
      model,
      prompt: 'Quick provider connectivity test. Generate a tiny simple image.',
      n: 1,
      size: '1024x1024'
    };

    const endpoint = resolveEndpoint(provider, 'generate');
    const upstream = await fetchUpstream(endpoint, {
      method: 'POST',
      headers: buildHeaders(provider),
      body: JSON.stringify(payload),
      signal: timeoutSignal(Math.min(provider.timeoutMs, 60_000))
    }, 1);

    const text = await upstream.text();
    res.json({
      ok: upstream.ok,
      status: upstream.status,
      message: upstream.ok ? 'OK' : extractMessage(text),
      createdAt: Date.now()
    });
  } catch (error) {
    res.json({
      ok: false,
      status: error instanceof HttpError ? error.statusCode : null,
      message: error instanceof Error ? error.message : String(error),
      createdAt: Date.now()
    });
  }
});

app.post('/api/provider/probe', async (req, res) => {
  try {
    const provider = ProviderSchema.parse(req.body.provider ?? {});
    const model = provider.modelId?.trim() || 'gpt-image-2';

    // Validate key early so the user gets one clean error, not a wall of repeated failures.
    getProviderApiKey(provider);

    const baseGenerate = {
      model,
      prompt: 'Create a tiny red square centered on a white background.',
      n: 1,
      size: '1024x1024',
      quality: 'low'
    };

    const baseEdit = {
      model,
      prompt: 'Add a tiny blue dot in the center. Keep everything else unchanged.',
      n: 1,
      size: '1024x1024',
      quality: 'low'
    };

    const report: ProbeReport = {
      fingerprint: providerFingerprint(provider),
      createdAt: Date.now(),
      providerLabel: `${model} @ ${resolveEndpoint(provider, 'generate')}`,
      baseline: {
        generation: await probeJsonCase(provider, baseGenerate),
        edit: await probeEditCase(provider, baseEdit)
      },
      generation: {},
      edit: {}
    };

    report.baseline.unknownParamControlGeneration = await probeJsonCase(provider, { ...baseGenerate, __probe_unknown_param__: 'x' });
    report.baseline.unknownParamControlEdit = await probeEditCase(provider, { ...baseEdit, __probe_unknown_param__: 'x' });

    if (report.baseline.unknownParamControlGeneration.supported || report.baseline.unknownParamControlEdit?.supported) {
      report.caveat = 'Unknown parameter control was accepted at least once. This provider may silently ignore unsupported fields, so accepted does not always mean effective.';
    }

    const generationTests: Record<string, Record<string, unknown>> = {
      model: { ...baseGenerate, model },
      n: { ...baseGenerate, n: 1 },
      size: { ...baseGenerate, size: '1024x1024' },
      quality: { ...baseGenerate, quality: 'low' },
      background: { ...baseGenerate, background: 'opaque' },
      moderation: { ...baseGenerate, moderation: 'low' },
      output_format: { ...baseGenerate, output_format: 'jpeg' },
      output_compression: { ...baseGenerate, output_format: 'jpeg', output_compression: 80 },
      stream: { ...baseGenerate, stream: true },
      partial_images: { ...baseGenerate, stream: true, partial_images: 1 },
      response_format: { ...baseGenerate, response_format: 'b64_json' },
      user: { ...baseGenerate, user: 'provider-probe-user' },
      style: { ...baseGenerate, style: 'natural' }
    };

    const editTests: Record<string, { payload: Record<string, unknown>; includeMask?: boolean; isStream?: boolean }> = {
      model: { payload: { ...baseEdit, model } },
      n: { payload: { ...baseEdit, n: 1 } },
      size: { payload: { ...baseEdit, size: '1024x1024' } },
      quality: { payload: { ...baseEdit, quality: 'low' } },
      background: { payload: { ...baseEdit, background: 'opaque' } },
      moderation: { payload: { ...baseEdit, moderation: 'low' } },
      output_format: { payload: { ...baseEdit, output_format: 'jpeg' } },
      output_compression: { payload: { ...baseEdit, output_format: 'jpeg', output_compression: 80 } },
      stream: { payload: { ...baseEdit, stream: true }, isStream: true },
      partial_images: { payload: { ...baseEdit, stream: true, partial_images: 1 }, isStream: true },
      response_format: { payload: { ...baseEdit, response_format: 'b64_json' } },
      input_fidelity: { payload: { ...baseEdit, input_fidelity: 'low' } },
      user: { payload: { ...baseEdit, user: 'provider-probe-user' } },
      style: { payload: { ...baseEdit, style: 'natural' } }
    };

    for (const [key, payload] of Object.entries(generationTests)) {
      report.generation[key] = await probeJsonCase(provider, payload, key === 'stream' || key === 'partial_images');
    }

    for (const [key, test] of Object.entries(editTests)) {
      report.edit[key] = await probeEditCase(provider, test.payload, Boolean(test.includeMask), Boolean(test.isStream));
    }

    res.json(report);
  } catch (error) {
    sendServerError(res, error);
  }
});


app.get('/api/storage/generation-tasks', (_req, res) => {
  try {
    const tasks = loadEncryptedBlob<unknown[]>(historyBlobKey, []);
    const row = getStorageDb().prepare('SELECT updated_at, compressed_bytes, encrypted_bytes FROM encrypted_blobs WHERE key = ?').get(historyBlobKey) as { updated_at?: number; compressed_bytes?: number; encrypted_bytes?: number } | undefined;
    res.json({
      tasks: Array.isArray(tasks) ? tasks : [],
      storage: {
        backend: 'sqlite-aes-gcm-brotli',
        dbPath: storageDbPath,
        updatedAt: row?.updated_at ?? null,
        compressedBytes: row?.compressed_bytes ?? 0,
        encryptedBytes: row?.encrypted_bytes ?? 0
      }
    });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.put('/api/storage/generation-tasks', (req, res) => {
  try {
    const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
    const stats = saveEncryptedBlob(historyBlobKey, tasks);
    res.json({ ok: true, count: tasks.length, storage: { backend: 'sqlite-aes-gcm-brotli', dbPath: storageDbPath, ...stats } });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.delete('/api/storage/generation-tasks', (_req, res) => {
  try {
    const stats = saveEncryptedBlob(historyBlobKey, []);
    res.json({ ok: true, count: 0, storage: { backend: 'sqlite-aes-gcm-brotli', dbPath: storageDbPath, ...stats } });
  } catch (error) {
    sendServerError(res, error);
  }
});

app.get('/api/defaults', (_req, res) => {
  res.json({
    generationEndpoint: env('DEFAULT_GENERATION_ENDPOINT', 'https://api.openai.com/v1/images/generations'),
    editEndpoint: env('DEFAULT_EDIT_ENDPOINT', 'https://api.openai.com/v1/images/edits'),
    responsesEndpoint: env('DEFAULT_RESPONSES_ENDPOINT', 'https://api.openai.com/v1/responses'),
    modelId: env('DEFAULT_MODEL_ID', 'gpt-image-2'),
    hasEnvApiKey: Boolean(env('OPENAI_API_KEY'))
  });
});

const clientDist = path.resolve(__dirname, '../dist/client');
const clientIndex = path.join(clientDist, 'index.html');
app.use(express.static(clientDist));
app.get(/.*/, (_req, res, next) => {
  if (!fs.existsSync(clientIndex)) return next();
  res.sendFile(clientIndex);
});

const port = Number(process.env.PORT || 8787);
const host = env('HOST', '127.0.0.1');
app.listen(port, host, () => {
  console.log(`Image Studio proxy listening on http://${host}:${port}`);
});
