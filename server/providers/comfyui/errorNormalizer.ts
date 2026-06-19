import { HttpError, compactCause } from '../types';

export function describeComfyUiError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object') {
    const root = data as any;
    const message = root.error?.message ?? root.error ?? root.message ?? root.exception_message;
    const details = root.node_errors ?? root.details ?? root.traceback;
    if (message && details) {
      return `ComfyUI rejected the request: ${String(message)}\n${typeof details === 'string' ? details : JSON.stringify(details, null, 2)}`;
    }
    if (message) return `ComfyUI rejected the request: ${String(message)}`;
  }
  return fallback || 'ComfyUI request failed.';
}

export function normalizeComfyUiFetchFailure(error: unknown, url: string): HttpError {
  if ((error as any)?.name === 'AbortError') {
    return new HttpError('ComfyUI request was cancelled or timed out.', 499);
  }
  const details = compactCause(error);
  return new HttpError(
    `Cannot reach ComfyUI at ${url}.${details ? ` ${details}` : ''}`,
    502
  );
}
