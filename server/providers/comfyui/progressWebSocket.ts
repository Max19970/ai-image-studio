import type { ProviderPreviewStreamMode, ProviderSettings } from '../types';
import { resolveComfyUiUrl } from './endpoints';
import { describeError, progressEvent, type StreamEvent } from './progressEvents';
import {
  createPreviewThrottleState,
  extractPreviewImage,
  messageDataToBuffer,
  normalizePreviewStreamMode,
  shouldEmitPreview
} from './progressPreview';

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

export function connectComfyUiWebSocket(args: {
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
  const previewThrottleState = createPreviewThrottleState();

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
