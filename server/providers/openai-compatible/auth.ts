import { env, type ProviderSettings } from '../types';

export function getProviderApiKey(provider: ProviderSettings): string {
  const key = (provider.apiKey || env('OPENAI_API_KEY') || '').trim();
  if (!key) return '';
  if ([...key].some((ch) => ch.charCodeAt(0) > 127)) {
    throw new Error('API key contains non-ASCII characters. Use the real provider key, not a placeholder with кириллица.');
  }
  return key;
}

export function buildOpenAiCompatibleHeaders(provider: ProviderSettings, isMultipart = false): Headers {
  const headers = new Headers();
  headers.set('Accept', 'application/json, text/event-stream');
  headers.set('Accept-Encoding', 'identity');
  headers.set('Connection', 'close');
  if (!isMultipart) headers.set('Content-Type', 'application/json');

  const key = getProviderApiKey(provider);
  if (key) {
    const headerName = provider.authHeaderName || 'Authorization';
    const scheme = provider.authScheme?.trim();
    headers.set(headerName, scheme ? `${scheme} ${key}` : key);
  }

  const custom = provider.customHeadersJson?.trim();
  if (custom) {
    const parsed = JSON.parse(custom) as Record<string, string>;
    Object.entries(parsed).forEach(([header, value]) => headers.set(header, String(value)));
  }

  return headers;
}
