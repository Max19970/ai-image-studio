import { HttpError } from '../../http/httpError';
import type { ProviderSettings } from '../types';
import { describeComfyUiError, normalizeComfyUiFetchFailure } from './errorNormalizer';

export interface ComfyUiRequestOptions extends RequestInit {
  timeoutMs: number;
  signal?: AbortSignal;
}

export function parseCustomHeaders(provider: Pick<ProviderSettings, 'customHeadersJson'>): HeadersInit {
  const raw = provider.customHeadersJson?.trim();
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Custom headers JSON must be an object.');
    }
    return Object.fromEntries(Object.entries(value).map(([key, headerValue]) => [key, String(headerValue)]));
  } catch (error) {
    throw new HttpError(`Invalid ComfyUI custom headers JSON: ${error instanceof Error ? error.message : String(error)}`, 400);
  }
}

export function mergeAbortSignals(input?: AbortSignal, timeoutMs = 240_000): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`ComfyUI request timed out after ${timeoutMs} ms.`)), timeoutMs);
  timeout.unref?.();

  const abort = () => controller.abort(input?.reason ?? new Error('ComfyUI request was aborted.'));
  if (input?.aborted) abort();
  else input?.addEventListener('abort', abort, { once: true });

  controller.signal.addEventListener('abort', () => {
    clearTimeout(timeout);
    input?.removeEventListener('abort', abort);
  }, { once: true });

  return controller.signal;
}

export async function fetchComfyUiJson<T>(provider: ProviderSettings, url: string, init: ComfyUiRequestOptions): Promise<T> {
  const response = await fetchComfyUi(provider, url, init);
  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw text for error reporting below
  }

  if (!response.ok) {
    throw new HttpError(describeComfyUiError(data, response.statusText || `HTTP ${response.status}`), response.status);
  }

  return data as T;
}

export async function fetchComfyUi(provider: ProviderSettings, url: string, init: ComfyUiRequestOptions): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  for (const [key, value] of Object.entries(parseCustomHeaders(provider))) {
    headers.set(key, String(value));
  }

  try {
    return await fetch(url, {
      ...init,
      headers,
      signal: mergeAbortSignals(init.signal, init.timeoutMs)
    });
  } catch (error) {
    throw normalizeComfyUiFetchFailure(error, url);
  }
}
