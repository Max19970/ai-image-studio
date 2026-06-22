import {
  HttpError,
  type ProviderFetchContext,
  type ProviderPreviewStreamMode,
  type ProviderSettings,
  type UpstreamRequestResult
} from '../types';
import { resolveComfyUiEndpoint, resolveComfyUiUrl } from './endpoints';
import { fetchComfyUiJson } from './http';
import { describeComfyUiError } from './errorNormalizer';
import { registerComfyUiPromptCancellation } from './cancellation';
import {
  mapComfyUiGenerationResult,
  type ComfyUiPromptResponse
} from './responseMapper';
import type { ComfyUiResolvedGenerationConfig, ComfyUiWorkflow } from './workflowTemplates';

interface ComfyUiHistoryResponse {
  [promptId: string]: unknown;
}

interface StreamEvent {
  type: string;
  [key: string]: unknown;
}

type ComfyUiProgressEvent = ReturnType<typeof progressEvent>;

const encoder = new TextEncoder();
const COMFYUI_PREVIEW_THROTTLE_MS = 2_500;
const COMFYUI_THROTTLED_PREVIEW_MAX_BYTES = 1_500_000;

interface ComfyUiPreviewThrottleState {
  lastEmittedAt: number;
}

function normalizePreviewStreamMode(mode?: ProviderPreviewStreamMode): ProviderPreviewStreamMode {
  return mode ?? 'throttled';
}

function shouldEmitPreview(
  preview: { bytes: Buffer },
  mode: ProviderPreviewStreamMode,
  state: ComfyUiPreviewThrottleState,
  now = Date.now()
): boolean {
  if (mode === 'off') return false;
  if (mode === 'full') return true;
  if (preview.bytes.length > COMFYUI_THROTTLED_PREVIEW_MAX_BYTES) return false;
  if (state.lastEmittedAt > 0 && now - state.lastEmittedAt < COMFYUI_PREVIEW_THROTTLE_MS) return false;
  state.lastEmittedAt = now;
  return true;
}

function hasNodeErrors(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value as Record<string, unknown>).length > 0;
}

function abortIfNeeded(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new HttpError('ComfyUI request was cancelled.', 499);
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    timeout.unref?.();
    const abort = () => {
      clearTimeout(timeout);
      reject(new HttpError('ComfyUI request was cancelled.', 499));
    };
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

async function waitForPromptHistory(provider: ProviderSettings, promptId: string, signal?: AbortSignal): Promise<unknown> {
  const started = Date.now();
  const timeoutMs = provider.timeoutMs;
  const pollMs = 750;

  while (Date.now() - started <= timeoutMs) {
    abortIfNeeded(signal);
    const history = await fetchComfyUiJson<ComfyUiHistoryResponse>(provider, resolveComfyUiUrl(provider, `/history/${encodeURIComponent(promptId)}`), {
      method: 'GET',
      timeoutMs,
      signal
    });
    const promptHistory = history?.[promptId];
    if (promptHistory && typeof promptHistory === 'object' && Object.keys(promptHistory as object).length > 0) {
      return promptHistory;
    }
    await sleep(pollMs, signal);
  }

  throw new HttpError(`Timed out waiting for ComfyUI prompt ${promptId}.`, 504);
}

function resolveComfyUiWebSocketUrl(provider: ProviderSettings, clientId: string): string {
  const url = new URL(resolveComfyUiUrl(provider, '/ws'));
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('clientId', clientId);
  return url.toString();
}

function normalizePercent(value: number, max: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function hasImageSignature(buffer: Buffer, offset: number): boolean {
  if (buffer.length <= offset + 4) return false;
  const png = buffer[offset] === 0x89 && buffer[offset + 1] === 0x50 && buffer[offset + 2] === 0x4e && buffer[offset + 3] === 0x47;
  const jpeg = buffer[offset] === 0xff && buffer[offset + 1] === 0xd8;
  const webp = buffer.toString('ascii', offset, offset + 4) === 'RIFF' && buffer.toString('ascii', offset + 8, offset + 12) === 'WEBP';
  return png || jpeg || webp;
}

function detectImageFormat(buffer: Buffer): string {
  if (hasImageSignature(buffer, 0)) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
    if (buffer.toString('ascii', 0, 4) === 'RIFF') return 'webp';
  }
  return 'png';
}

function extractPreviewImage(buffer: Buffer): { bytes: Buffer; format: string } | null {
  const stableOffsets = [0, 8, 12];
  const stableOffset = stableOffsets.find((candidate) => hasImageSignature(buffer, candidate));
  if (stableOffset !== undefined) {
    const bytes = buffer.subarray(stableOffset);
    return { bytes, format: detectImageFormat(bytes) };
  }

  const scanLimit = Math.min(buffer.length - 12, 64 * 1024);
  for (let offset = 0; offset <= scanLimit; offset += 1) {
    if (!hasImageSignature(buffer, offset)) continue;
    const bytes = buffer.subarray(offset);
    return { bytes, format: detectImageFormat(bytes) };
  }
  return null;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function messageDataToBuffer(data: unknown): Promise<Buffer> {
  if (data instanceof Blob) return Buffer.from(await data.arrayBuffer());
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (Buffer.isBuffer(data)) return data;
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return Buffer.from(await new Response(data as BodyInit).arrayBuffer());
}

function connectComfyUiWebSocket(args: {
  provider: ProviderSettings;
  clientId: string;
  getPromptId: () => string;
  emit: (event: StreamEvent) => void;
  signal?: AbortSignal;
  previewStreamMode?: ProviderPreviewStreamMode;
}): WebSocket | null {
  if (typeof WebSocket === 'undefined') {
    args.emit({ type: 'comfyui.progress', progress: progressEvent({ stage: 'polling', message: 'WebSocket is not available in this runtime.' }) });
    return null;
  }

  const url = resolveComfyUiWebSocketUrl(args.provider, args.clientId);
  let ws: WebSocket;
  try {
    ws = new WebSocket(url);
  } catch (error) {
    args.emit({ type: 'comfyui.progress', progress: progressEvent({ stage: 'polling', message: describeError(error) }) });
    return null;
  }

  ws.binaryType = 'arraybuffer';
  const previewStreamMode = normalizePreviewStreamMode(args.previewStreamMode);
  const previewThrottleState: ComfyUiPreviewThrottleState = { lastEmittedAt: 0 };

  const belongsToPrompt = (data: any) => {
    const promptId = args.getPromptId();
    return !data?.prompt_id || !promptId || data.prompt_id === promptId;
  };

  ws.addEventListener('message', (event) => {
    if (typeof event.data === 'string') {
      let parsed: any;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      const data = parsed?.data ?? {};
      if (!belongsToPrompt(data)) return;

      if (parsed?.type === 'progress') {
        const step = Number(data.value);
        const maxSteps = Number(data.max);
        args.emit({
          type: 'comfyui.progress',
          progress: progressEvent({
            percent: normalizePercent(step, maxSteps),
            step: Number.isFinite(step) ? step : null,
            maxSteps: Number.isFinite(maxSteps) ? maxSteps : null,
            nodeId: typeof data.node === 'string' ? data.node : null,
            stage: 'sampling'
          })
        });
        return;
      }

      if (parsed?.type === 'executing') {
        args.emit({
          type: 'comfyui.progress',
          progress: progressEvent({
            nodeId: typeof data.node === 'string' ? data.node : null,
            stage: data.node ? 'executing' : 'finalizing'
          })
        });
        return;
      }

      if (parsed?.type === 'executed') {
        args.emit({
          type: 'comfyui.progress',
          progress: progressEvent({
            nodeId: typeof data.node === 'string' ? data.node : null,
            stage: 'executed'
          })
        });
      }
      return;
    }

    if (previewStreamMode === 'off') return;

    void (async () => {
      const raw = await messageDataToBuffer(event.data);
      const preview = extractPreviewImage(raw);
      if (!preview || !shouldEmitPreview(preview, previewStreamMode, previewThrottleState)) return;
      args.emit({
        type: 'comfyui.preview',
        b64_json: preview.bytes.toString('base64'),
        output_format: preview.format,
        progress: progressEvent({ stage: 'preview' })
      });
    })();
  });

  args.signal?.addEventListener('abort', () => ws.close(), { once: true });
  ws.addEventListener('open', () => {
    args.emit({ type: 'comfyui.progress', progress: progressEvent({ stage: 'connected', message: 'Connected to ComfyUI websocket.' }) });
  }, { once: true });
  ws.addEventListener('error', () => {
    args.emit({ type: 'comfyui.progress', progress: progressEvent({ stage: 'polling', message: 'ComfyUI websocket connection failed; waiting for final history result.' }) });
  }, { once: true });

  return ws;
}

function progressEvent(input: {
  percent?: number | null;
  step?: number | null;
  maxSteps?: number | null;
  stage?: string | null;
  nodeId?: string | null;
  message?: string | null;
}) {
  return {
    providerAdapterId: 'comfyui',
    percent: input.percent ?? null,
    step: input.step ?? null,
    maxSteps: input.maxSteps ?? null,
    stage: input.stage ?? null,
    nodeId: input.nodeId ?? null,
    message: input.message ?? null,
    updatedAt: Date.now()
  };
}

function keepLastMeasuredProgress(progress: ComfyUiProgressEvent, lastProgress: ComfyUiProgressEvent | null): ComfyUiProgressEvent {
  if (progress.percent !== null || !lastProgress || lastProgress.percent === null) return progress;
  if (progress.stage === 'completed' || progress.stage === 'error') return progress;
  return {
    ...progress,
    percent: lastProgress.percent,
    step: progress.step ?? lastProgress.step,
    maxSteps: progress.maxSteps ?? lastProgress.maxSteps
  };
}

export function runComfyUiWorkflowStream(args: {
  provider: ProviderSettings;
  workflow: ComfyUiWorkflow;
  config: ComfyUiResolvedGenerationConfig;
  clientId: string;
  context?: ProviderFetchContext;
}): UpstreamRequestResult {
  const endpoint = resolveComfyUiEndpoint(args.provider, 'generate');
  const stream = new ReadableStream<Uint8Array>({
    start: (controller) => {
      let closed = false;
      let ws: WebSocket | null = null;
      let promptId = '';
      let cleanupPromptCancellation: (() => void) | null = null;
      let lastMeasuredProgress: ComfyUiProgressEvent | null = null;

      const close = () => {
        if (closed) return;
        closed = true;
        try { ws?.close(); } catch { /* ignore */ }
        controller.close();
      };

      const emit = (event: StreamEvent) => {
        if (closed) return;
        const progress = (event as { progress?: ComfyUiProgressEvent }).progress;
        if (progress) {
          const nextProgress = keepLastMeasuredProgress(progress, lastMeasuredProgress);
          (event as StreamEvent & { progress: ComfyUiProgressEvent }).progress = nextProgress;
          if (nextProgress.percent !== null || nextProgress.step !== null || nextProgress.maxSteps !== null) {
            lastMeasuredProgress = nextProgress;
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const fail = (error: unknown) => {
        const message = describeError(error);
        emit({ type: 'comfyui.error', error: { message }, progress: progressEvent({ stage: 'error', message }) });
        close();
      };

      args.context?.signal?.addEventListener('abort', () => fail(new HttpError('ComfyUI request was cancelled.', 499)), { once: true });

      void (async () => {
        try {
          ws = connectComfyUiWebSocket({
            provider: args.provider,
            clientId: args.clientId,
            getPromptId: () => promptId,
            emit,
            signal: args.context?.signal,
            previewStreamMode: args.context?.previewStreamMode
          });

          const promptResponse = await fetchComfyUiJson<ComfyUiPromptResponse>(args.provider, endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: args.workflow, client_id: args.clientId }),
            timeoutMs: args.provider.timeoutMs,
            signal: args.context?.signal
          });

          if (hasNodeErrors(promptResponse.node_errors)) {
            throw new HttpError(describeComfyUiError(promptResponse, 'ComfyUI workflow validation failed.'), 400);
          }

          promptId = String(promptResponse.prompt_id ?? '').trim();
          if (!promptId) {
            throw new HttpError(`ComfyUI did not return a prompt_id. Response: ${JSON.stringify(promptResponse)}`, 502);
          }
          cleanupPromptCancellation = registerComfyUiPromptCancellation({
            provider: args.provider,
            promptId,
            signal: args.context?.signal
          });

          emit({ type: 'comfyui.progress', progress: progressEvent({ percent: 0, stage: 'queued', message: `Prompt id: ${promptId}` }) });

          const history = await waitForPromptHistory(args.provider, promptId, args.context?.signal);
          const normalized = await mapComfyUiGenerationResult({
            provider: args.provider,
            promptId,
            history,
            workflow: args.workflow,
            config: args.config
          });

          emit({
            ...normalized,
            type: 'comfyui.final',
            progress: progressEvent({ percent: 100, stage: 'completed' })
          });
          close();
        } catch (error) {
          fail(error);
        } finally {
          cleanupPromptCancellation?.();
        }
      })();
    }
  });

  return {
    endpoint,
    upstream: new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform' }
    })
  };
}
