import {
  validatePromptPayload,
  type ProviderFetchContext,
  type ProviderModeSubmitInput,
  type ProviderSettings,
  type UploadedFile,
  type UpstreamRequestResult
} from '../types';
import { buildOpenAiCompatibleHeaders } from './auth';
import { resolveOpenAiCompatibleEndpoint } from './endpoints';
import { appendOpenAiCompatibleEditPayload, validateEditFiles } from './multipartEdit';
import { resolveOpenAiCompatibleRequestSignal } from './requestSignal';
import { resolveOpenAiCompatibleSubmitOperation } from './submitOperation';
import {
  createOpenAiCompatibleUpstreamDiagnostics,
  fetchUpstream,
  logOutboundRequest
} from './upstreamClient';

export async function fetchOpenAiCompatibleGenerate(
  provider: ProviderSettings,
  payload: Record<string, unknown>,
  context: ProviderFetchContext = {}
): Promise<UpstreamRequestResult> {
  validatePromptPayload(payload);
  const endpoint = resolveOpenAiCompatibleEndpoint(provider, 'generate');
  logOutboundRequest('generate', endpoint, payload, [], context.runtimeTraceId);
  const upstream = await fetchUpstream(endpoint, {
    method: 'POST',
    headers: buildOpenAiCompatibleHeaders(provider),
    body: JSON.stringify(payload),
    signal: resolveOpenAiCompatibleRequestSignal(provider, context)
  }, undefined, createOpenAiCompatibleUpstreamDiagnostics({
    operation: 'generate',
    provider,
    endpoint,
    payload,
    traceId: context.runtimeTraceId
  }));
  return { endpoint, upstream };
}

export async function fetchOpenAiCompatibleEdit(
  provider: ProviderSettings,
  payload: Record<string, unknown>,
  files: UploadedFile[],
  context: ProviderFetchContext = {}
): Promise<UpstreamRequestResult> {
  validatePromptPayload(payload);
  validateEditFiles(files);
  const endpoint = resolveOpenAiCompatibleEndpoint(provider, 'edit');
  logOutboundRequest('edit', endpoint, payload, files, context.runtimeTraceId);

  const form = new FormData();
  appendOpenAiCompatibleEditPayload(form, payload, files);

  const upstream = await fetchUpstream(endpoint, {
    method: 'POST',
    headers: buildOpenAiCompatibleHeaders(provider, true),
    body: form,
    signal: resolveOpenAiCompatibleRequestSignal(provider, context)
  }, undefined, createOpenAiCompatibleUpstreamDiagnostics({
    operation: 'edit',
    provider,
    endpoint,
    payload,
    files,
    traceId: context.runtimeTraceId
  }));
  return { endpoint, upstream };
}

export async function submitOpenAiCompatibleProviderMode(input: ProviderModeSubmitInput): Promise<UpstreamRequestResult> {
  const operation = resolveOpenAiCompatibleSubmitOperation(input);
  if (operation === 'edit') {
    return fetchOpenAiCompatibleEdit(input.provider, input.payload, input.files, input.context);
  }
  return fetchOpenAiCompatibleGenerate(input.provider, input.payload, input.context);
}
