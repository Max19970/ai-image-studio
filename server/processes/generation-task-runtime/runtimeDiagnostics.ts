import { compactCause, type ProviderSettings, type ProviderSubmitTransportDefinition, type UploadedFile } from '../../providers/types';
import type { GenerationRequestSnapshot } from '../../../src/domain/generationTask';

function compactEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    return `${url.origin}${url.pathname}`;
  } catch {
    return endpoint;
  }
}

function payloadSummary(payload: Record<string, unknown>) {
  return {
    keys: Object.keys(payload).sort(),
    model: typeof payload.model === 'string' ? payload.model : undefined,
    size: typeof payload.size === 'string' ? payload.size : undefined,
    stream: payload.stream === true,
    responseFormat: typeof payload.response_format === 'string' ? payload.response_format : undefined,
    outputFormat: typeof payload.output_format === 'string' ? payload.output_format : undefined
  };
}

function filesSummary(files: UploadedFile[]) {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  return {
    count: files.length,
    totalBytes,
    totalMb: Number((totalBytes / 1024 / 1024).toFixed(3)),
    fields: files.map((file) => ({
      field: file.fieldname,
      mime: file.mimetype,
      size: file.size,
      mb: Number((file.size / 1024 / 1024).toFixed(3))
    }))
  };
}

export function describeAbortSignal(signal: AbortSignal): string | null {
  if (!signal.aborted) return null;
  const reason = signal.reason as any;
  if (!reason) return 'aborted';
  if (reason instanceof Error) return `${reason.name}: ${reason.message}`;
  return String(reason);
}

export function describeRuntimeError(error: unknown): string {
  const anyError = error as any;
  const cause = compactCause(error);
  const name = anyError?.name ? String(anyError.name) : 'Error';
  const message = anyError?.message ? String(anyError.message) : String(error);
  return cause ? `${name}: ${message} (${cause})` : `${name}: ${message}`;
}

export function logGenerationRuntimeEvent(taskId: string, event: string, details: Record<string, unknown> = {}) {
  console.info(`[generation-task-runtime] task=${taskId} event=${event} ${JSON.stringify(details)}`);
}

interface RuntimeDiagnosticInput {
  provider: ProviderSettings;
  payload: Record<string, unknown>;
  files: UploadedFile[];
  snapshot: GenerationRequestSnapshot;
  providerModeId?: string | null;
  transport?: ProviderSubmitTransportDefinition | null;
  retryAttempts?: number;
  retryDelaySeconds?: number;
}

export function logGenerationTaskQueued(taskId: string, input: RuntimeDiagnosticInput) {
  logGenerationRuntimeEvent(taskId, 'queued', {
    adapterId: input.provider.adapterId,
    providerLabel: input.snapshot.providerLabel,
    mode: input.snapshot.mode,
    providerModeId: input.providerModeId ?? null,
    transport: input.transport ?? null,
    retryAttempts: input.retryAttempts ?? 0,
    retryDelaySeconds: input.retryDelaySeconds ?? 0,
    payload: payloadSummary(input.payload),
    files: filesSummary(input.files)
  });
}

export function logGenerationPipelineStart(taskId: string, input: RuntimeDiagnosticInput) {
  logGenerationRuntimeEvent(taskId, 'pipeline-start', {
    adapterId: input.provider.adapterId,
    providerLabel: input.snapshot.providerLabel,
    mode: input.snapshot.mode,
    endpoint: input.snapshot.endpoint,
    payload: payloadSummary(input.payload),
    files: filesSummary(input.files)
  });
}

export function logGenerationPipelineTerminal(taskId: string, event: 'succeeded' | 'failed' | 'cancelled', details: Record<string, unknown> = {}) {
  logGenerationRuntimeEvent(taskId, event, details);
}

export interface UpstreamDiagnosticsInput {
  traceId?: string;
  operation: 'generate' | 'edit' | 'provider-submit';
  provider: ProviderSettings;
  endpoint: string;
  payload: Record<string, unknown>;
  files?: UploadedFile[];
}

export function logUpstreamAttempt(details: UpstreamDiagnosticsInput & { attempt: number; attempts: number }) {
  console.info(`[upstream] trace=${details.traceId ?? '-'} event=attempt ${JSON.stringify({
    attempt: details.attempt,
    attempts: details.attempts,
    operation: details.operation,
    adapterId: details.provider.adapterId,
    endpoint: compactEndpoint(details.endpoint),
    payload: payloadSummary(details.payload),
    files: filesSummary(details.files ?? [])
  })}`);
}

export function logUpstreamResponse(details: UpstreamDiagnosticsInput & { attempt: number; attempts: number; elapsedMs: number; response: Response }) {
  console.info(`[upstream] trace=${details.traceId ?? '-'} event=response ${JSON.stringify({
    attempt: details.attempt,
    attempts: details.attempts,
    elapsedMs: details.elapsedMs,
    operation: details.operation,
    endpoint: compactEndpoint(details.endpoint),
    status: details.response.status,
    ok: details.response.ok,
    contentType: details.response.headers.get('content-type'),
    requestId: details.response.headers.get('x-request-id') ?? details.response.headers.get('request-id') ?? null
  })}`);
}

export function logUpstreamFailure(details: UpstreamDiagnosticsInput & { attempt: number; attempts: number; elapsedMs: number; error: unknown; retrying: boolean }) {
  console.warn(`[upstream] trace=${details.traceId ?? '-'} event=failure ${JSON.stringify({
    attempt: details.attempt,
    attempts: details.attempts,
    elapsedMs: details.elapsedMs,
    operation: details.operation,
    endpoint: compactEndpoint(details.endpoint),
    retrying: details.retrying,
    error: describeRuntimeError(details.error)
  })}`);
}
