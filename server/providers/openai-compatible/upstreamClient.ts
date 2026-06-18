import { describeFetchFailure, isRetryableNetworkError } from './errorNormalizer';

export function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref();
  return controller.signal;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchUpstream(endpoint: string, init: RequestInit, attempts = 2): Promise<Response> {
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

export function logOutboundRequest(kind: 'generate' | 'edit', endpoint: string, payload: Record<string, unknown>, files: { size: number }[] = []) {
  const payloadKeys = Object.keys(payload).sort().join(', ') || 'none';
  const fileSummary = files.length
    ? `${files.length} file(s), ${(files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB`
    : 'no files';
  console.info(`[proxy] ${kind} -> ${endpoint} | payload: ${payloadKeys} | ${fileSummary}`);
}
