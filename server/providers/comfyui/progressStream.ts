import {
  HttpError,
  type ProviderFetchContext,
  type ProviderSettings,
  type UpstreamRequestResult
} from '../types';
import { resolveComfyUiEndpoint } from './endpoints';
import { fetchComfyUiJson } from './http';
import { describeComfyUiError } from './errorNormalizer';
import { registerComfyUiPromptCancellation } from './cancellation';
import {
  mapComfyUiGenerationResult,
  type ComfyUiPromptResponse
} from './responseMapper';
import type { ComfyUiResolvedGenerationConfig, ComfyUiWorkflow } from './workflowTypes';
import {
  describeError,
  keepLastMeasuredProgress,
  progressEvent,
  type ComfyUiProgressEvent,
  type StreamEvent
} from './progressEvents';
import { hasNodeErrors, waitForPromptHistory } from './progressPolling';
import { connectComfyUiWebSocket } from './progressWebSocket';

const encoder = new TextEncoder();

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
