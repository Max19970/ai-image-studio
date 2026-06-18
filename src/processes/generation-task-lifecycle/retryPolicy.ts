import { delay, isAbortError } from '../../domain/asyncFlow';

export interface RunnerRetryPolicy {
  extraAttempts: number;
  delayMs: number;
  totalAttempts: number;
}

export interface RunnerRetryPolicyInput {
  attempts: number;
  delaySeconds: number;
}

export interface RunnerRetryEvent {
  attempt: number;
  totalAttempts: number;
  error: string;
  waitMs: number;
}

export function createRunnerRetryPolicy(input: RunnerRetryPolicyInput): RunnerRetryPolicy {
  const extraAttempts = Math.max(0, Math.min(10, Math.round(input.attempts || 0)));
  const delayMs = Math.max(0, Math.min(600, Number(input.delaySeconds || 0))) * 1000;
  return {
    extraAttempts,
    delayMs,
    totalAttempts: extraAttempts + 1
  };
}

export async function runWithRetryPolicy<T>(args: {
  policy: RunnerRetryPolicy;
  run: () => Promise<T>;
  onRetry?: (event: RunnerRetryEvent) => void;
  signal?: AbortSignal;
}): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= args.policy.totalAttempts; attempt += 1) {
    if (args.signal?.aborted) throw new DOMException('Request was cancelled.', 'AbortError');
    try {
      return await args.run();
    } catch (error) {
      lastError = error;
      if (isAbortError(error) || args.signal?.aborted) throw error;
      if (attempt >= args.policy.totalAttempts) break;

      const message = error instanceof Error ? error.message : String(error);
      args.onRetry?.({
        attempt: attempt + 1,
        totalAttempts: args.policy.totalAttempts,
        error: message,
        waitMs: args.policy.delayMs
      });

      if (args.policy.delayMs > 0) await delay(args.policy.delayMs, args.signal);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'Unknown error'));
}
