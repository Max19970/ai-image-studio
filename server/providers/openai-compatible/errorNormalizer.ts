import { compactCause } from '../../http/errorCause';
import { HttpError } from '../../http/httpError';

export function extractUpstreamMessage(text: string): string {
  try {
    const json = JSON.parse(text);
    if (json?.error?.message) return String(json.error.message);
    if (json?.message) return String(json.message);
  } catch {
    // ignore non-JSON upstream bodies
  }
  return text.slice(0, 800);
}

export function describeFetchFailure(error: unknown, endpoint: string): HttpError {
  const anyError = error as any;
  const cause = compactCause(error);
  const timedOut = anyError?.name === 'AbortError';
  const message = timedOut
    ? `Upstream request timed out after the configured timeout: ${endpoint}`
    : `Could not reach upstream image endpoint: ${endpoint}${cause ? ` (${cause})` : ''}`;
  return new HttpError(message, 502);
}

export function isRetryableNetworkError(error: unknown): boolean {
  const anyError = error as any;
  const cause = anyError?.cause;
  const code = String(anyError?.code || cause?.code || '');
  return ['UND_ERR_SOCKET', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT', 'ECONNREFUSED'].includes(code);
}
