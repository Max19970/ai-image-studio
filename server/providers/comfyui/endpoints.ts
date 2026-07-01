import { env } from '../../config/env';
import { HttpError } from '../../http/httpError';
import type { ProviderOperationKind, ProviderSettings } from '../types';

const DEFAULT_COMFYUI_BASE_URL = 'http://127.0.0.1:8188';
const knownLeafRoutes = ['/prompt', '/view', '/object_info', '/system_stats', '/queue', '/interrupt'];

function stripKnownRoute(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '');
  for (const route of knownLeafRoutes) {
    if (normalized === route) return '';
    if (normalized.endsWith(route)) return normalized.slice(0, -route.length);
  }
  if (/\/history\/[^/]+$/.test(normalized)) return normalized.replace(/\/history\/[^/]+$/, '');
  if (/\/models\/[^/]+$/.test(normalized)) return normalized.replace(/\/models\/[^/]+$/, '');
  return normalized;
}

export function resolveComfyUiBaseUrl(provider: ProviderSettings): string {
  const raw = provider.generationEndpoint || env('COMFYUI_BASE_URL', DEFAULT_COMFYUI_BASE_URL);
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP/HTTPS ComfyUI endpoints are allowed.');
  url.hash = '';
  url.search = '';
  url.pathname = stripKnownRoute(url.pathname).replace(/\/+$/, '');
  return url.toString().replace(/\/+$/, '');
}

export function resolveComfyUiUrl(provider: ProviderSettings, route: string): string {
  const cleanRoute = route.startsWith('/') ? route : `/${route}`;
  return `${resolveComfyUiBaseUrl(provider)}${cleanRoute}`;
}

export function resolveComfyUiEndpoint(provider: ProviderSettings, kind: ProviderOperationKind): string {
  if (kind === 'edit') {
    throw new HttpError('ComfyUI MVP provider supports text-to-image generation only. Image edits are not available yet.', 400);
  }
  return resolveComfyUiUrl(provider, '/prompt');
}

export function comfyUiProviderFingerprint(provider: ProviderSettings): string {
  return [
    resolveComfyUiBaseUrl(provider),
    provider.modelId?.trim() ?? '',
    provider.timeoutMs,
    provider.customHeadersJson?.trim() ?? ''
  ].join('|');
}
