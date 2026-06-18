import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';

export type ProviderProbeCacheMap = Record<string, ProviderProbeReport>;

export function getProviderFingerprint(settings: ProviderSettings): string {
  return [
    (settings.adapterId ?? 'openai-compatible').trim(),
    settings.generationEndpoint.trim(),
    settings.editEndpoint.trim(),
    settings.responsesEndpoint.trim(),
    settings.modelId.trim(),
    settings.authHeaderName.trim(),
    settings.authScheme.trim(),
    settings.customHeadersJson.trim()
  ].join('|');
}

export function normalizeProviderProbeCache(value: unknown): ProviderProbeCacheMap {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as ProviderProbeCacheMap;
}

export function getCachedProviderProbeReport(map: ProviderProbeCacheMap, settings: ProviderSettings): ProviderProbeReport | null {
  return map[getProviderFingerprint(settings)] ?? null;
}

export function withCachedProviderProbeReport(map: ProviderProbeCacheMap, report: ProviderProbeReport): ProviderProbeCacheMap {
  return { ...map, [report.fingerprint]: report };
}

export function withoutCachedProviderProbeReport(map: ProviderProbeCacheMap, settings: ProviderSettings): ProviderProbeCacheMap {
  const next = { ...map };
  delete next[getProviderFingerprint(settings)];
  return next;
}
