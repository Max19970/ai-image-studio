import { HttpError, type ProviderFetchContext, type ProviderSettings, type UploadedFile, type UpstreamRequestResult } from '../types';
import { resolveComfyUiEndpoint, resolveComfyUiUrl } from './endpoints';
import { fetchComfyUiJson } from './http';
import { describeComfyUiError } from './errorNormalizer';
import { createJsonResponse, mapComfyUiGenerationResult, type ComfyUiPromptResponse } from './responseMapper';
import { buildComfyUiTextToImageWorkflow, resolveComfyUiGenerationConfig } from './workflowTemplates';

interface ComfyUiHistoryResponse {
  [promptId: string]: unknown;
}


function hasNodeErrors(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.keys(value as Record<string, unknown>).length > 0;
}

function buildClientId() {
  return `image-studio-${crypto.randomUUID()}`;
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

export async function fetchComfyUiGenerate(
  provider: ProviderSettings,
  payload: Record<string, unknown>,
  context: ProviderFetchContext = {}
): Promise<UpstreamRequestResult> {
  const endpoint = resolveComfyUiEndpoint(provider, 'generate');
  const config = resolveComfyUiGenerationConfig(provider, payload);
  const workflow = buildComfyUiTextToImageWorkflow(config);
  const clientId = buildClientId();

  const promptResponse = await fetchComfyUiJson<ComfyUiPromptResponse>(provider, endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    timeoutMs: provider.timeoutMs,
    signal: context.signal
  });

  if (hasNodeErrors(promptResponse.node_errors)) {
    throw new HttpError(describeComfyUiError(promptResponse, 'ComfyUI workflow validation failed.'), 400);
  }

  const promptId = String(promptResponse.prompt_id ?? '').trim();
  if (!promptId) {
    throw new HttpError(`ComfyUI did not return a prompt_id. Response: ${JSON.stringify(promptResponse)}`, 502);
  }

  const history = await waitForPromptHistory(provider, promptId, context.signal);
  const normalized = await mapComfyUiGenerationResult({ provider, promptId, history, workflow, config });
  return { endpoint, upstream: createJsonResponse(normalized) };
}

export async function fetchComfyUiEdit(
  _provider: ProviderSettings,
  _payload: Record<string, unknown>,
  _files: UploadedFile[]
): Promise<UpstreamRequestResult> {
  throw new HttpError('ComfyUI MVP provider supports text-to-image generation only. Image edits and masks are not available yet.', 400);
}
