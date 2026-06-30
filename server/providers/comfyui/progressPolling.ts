import { HttpError, type ProviderSettings } from '../types';
import { resolveComfyUiUrl } from './endpoints';
import { fetchComfyUiJson } from './http';

interface ComfyUiHistoryResponse {
  [promptId: string]: unknown;
}

export function hasNodeErrors(value: unknown): boolean {
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

export async function waitForPromptHistory(provider: ProviderSettings, promptId: string, signal?: AbortSignal): Promise<unknown> {
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
