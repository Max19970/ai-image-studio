export function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Request was cancelled.', 'AbortError'));
      return;
    }
    const id = globalThis.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      globalThis.clearTimeout(id);
      reject(new DOMException('Request was cancelled.', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function runWithRetries<T>(args: {
  attempts: number;
  delaySeconds: number;
  run: () => Promise<T>;
  onRetry?: (attempt: number, totalAttempts: number, error: string, delayMs: number) => void;
  signal?: AbortSignal;
}): Promise<T> {
  const extraAttempts = Math.max(0, Math.min(10, Math.round(args.attempts || 0)));
  const delayMs = Math.max(0, Math.min(600, Number(args.delaySeconds || 0))) * 1000;
  const totalAttempts = extraAttempts + 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    if (args.signal?.aborted) throw new DOMException('Request was cancelled.', 'AbortError');
    try {
      return await args.run();
    } catch (error) {
      lastError = error;
      if (isAbortError(error) || args.signal?.aborted) throw error;
      if (attempt >= totalAttempts) break;
      const message = error instanceof Error ? error.message : String(error);
      args.onRetry?.(attempt + 1, totalAttempts, message, delayMs);
      if (delayMs > 0) await delay(delayMs, args.signal);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'Unknown error'));
}
