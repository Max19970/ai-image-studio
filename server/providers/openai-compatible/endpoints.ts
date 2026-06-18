import { env, type ProviderOperationKind, type ProviderSettings } from '../types';

export function resolveOpenAiCompatibleEndpoint(provider: ProviderSettings, kind: ProviderOperationKind): string {
  const fromProvider = kind === 'generate' ? provider.generationEndpoint : provider.editEndpoint;
  const fallback = kind === 'generate'
    ? env('DEFAULT_GENERATION_ENDPOINT', 'https://api.openai.com/v1/images/generations')
    : env('DEFAULT_EDIT_ENDPOINT', 'https://api.openai.com/v1/images/edits');
  const endpoint = fromProvider || fallback;
  const url = new URL(endpoint);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP/HTTPS endpoints are allowed.');
  return url.toString();
}

export function providerFingerprint(provider: ProviderSettings): string {
  return [
    provider.generationEndpoint?.trim() ?? '',
    provider.editEndpoint?.trim() ?? '',
    provider.responsesEndpoint?.trim() ?? '',
    provider.modelId?.trim() ?? '',
    provider.authHeaderName?.trim() ?? '',
    provider.authScheme?.trim() ?? '',
    provider.customHeadersJson?.trim() ?? ''
  ].join('|');
}
