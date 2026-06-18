import { validatePromptPayload, type ProviderSettings, type UploadedFile, type UpstreamRequestResult } from '../types';
import { buildOpenAiCompatibleHeaders } from './auth';
import { resolveOpenAiCompatibleEndpoint } from './endpoints';
import { appendOpenAiCompatibleEditPayload, validateEditFiles } from './multipartEdit';
import { fetchUpstream, logOutboundRequest, timeoutSignal } from './upstreamClient';

export async function fetchOpenAiCompatibleGenerate(provider: ProviderSettings, payload: Record<string, unknown>): Promise<UpstreamRequestResult> {
  validatePromptPayload(payload);
  const endpoint = resolveOpenAiCompatibleEndpoint(provider, 'generate');
  logOutboundRequest('generate', endpoint, payload);
  const upstream = await fetchUpstream(endpoint, {
    method: 'POST',
    headers: buildOpenAiCompatibleHeaders(provider),
    body: JSON.stringify(payload),
    signal: timeoutSignal(provider.timeoutMs)
  });
  return { endpoint, upstream };
}

export async function fetchOpenAiCompatibleEdit(provider: ProviderSettings, payload: Record<string, unknown>, files: UploadedFile[]): Promise<UpstreamRequestResult> {
  validatePromptPayload(payload);
  validateEditFiles(files);
  const endpoint = resolveOpenAiCompatibleEndpoint(provider, 'edit');
  logOutboundRequest('edit', endpoint, payload, files);

  const form = new FormData();
  appendOpenAiCompatibleEditPayload(form, payload, files);

  const upstream = await fetchUpstream(endpoint, {
    method: 'POST',
    headers: buildOpenAiCompatibleHeaders(provider, true),
    body: form,
    signal: timeoutSignal(provider.timeoutMs)
  });
  return { endpoint, upstream };
}
