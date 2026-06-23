import type { ProviderSettings, UploadedFile } from '../types';
import {
  logUpstreamAttempt,
  logUpstreamFailure,
  logUpstreamResponse,
  type UpstreamDiagnosticsInput
} from '../../processes/generation-task-runtime/runtimeDiagnostics';
import { describeFetchFailure, isRetryableNetworkError } from './errorNormalizer';

export function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms).unref();
  return controller.signal;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type FetchUpstreamDiagnostics = UpstreamDiagnosticsInput;

export async function fetchUpstream(
  endpoint: string,
  init: RequestInit,
  attempts = 3,
  diagnostics?: FetchUpstreamDiagnostics
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const started = Date.now();
    if (diagnostics) logUpstreamAttempt({ ...diagnostics, attempt, attempts });
    try {
      const response = await fetch(endpoint, init);
      if (diagnostics) logUpstreamResponse({ ...diagnostics, attempt, attempts, elapsedMs: Date.now() - started, response });
      return response;
    } catch (error) {
      lastError = error;
      const retrying = attempt < attempts && isRetryableNetworkError(error);
      if (diagnostics) logUpstreamFailure({ ...diagnostics, attempt, attempts, elapsedMs: Date.now() - started, error, retrying });
      if (!retrying) break;
      await sleep(450 * attempt);
    }
  }
  throw describeFetchFailure(lastError, endpoint);
}

export function logOutboundRequest(
  kind: 'generate' | 'edit',
  endpoint: string,
  payload: Record<string, unknown>,
  files: { size: number; mimetype?: string; fieldname?: string }[] = [],
  traceId?: string
) {
  const payloadKeys = Object.keys(payload).sort().join(', ') || 'none';
  const fileSummary = files.length
    ? `${files.length} file(s), ${(files.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB, ${[...new Set(files.map((file) => file.mimetype).filter(Boolean))].join(', ') || 'unknown types'}`
    : 'no files';
  console.info(`[proxy] trace=${traceId ?? '-'} ${kind} -> ${endpoint} | payload: ${payloadKeys} | ${fileSummary}`);
}

export function createOpenAiCompatibleUpstreamDiagnostics(args: {
  operation: 'generate' | 'edit';
  provider: ProviderSettings;
  endpoint: string;
  payload: Record<string, unknown>;
  files?: UploadedFile[];
  traceId?: string;
}): FetchUpstreamDiagnostics {
  return {
    traceId: args.traceId,
    operation: args.operation,
    provider: args.provider,
    endpoint: args.endpoint,
    payload: args.payload,
    files: args.files
  };
}
