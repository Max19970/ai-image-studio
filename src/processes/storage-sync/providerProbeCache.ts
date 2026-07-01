import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import { getCachedProviderProbeReport, normalizeProviderProbeCache, withoutCachedProviderProbeReport, withCachedProviderProbeReport } from '../../entities/provider-probe-cache';
import type { ProviderProbeCacheMap } from '../../entities/provider-probe-cache';
import { localProviderProbeCache } from '../../infrastructure/storage/localProviderProbeCache';
import { remoteProviderProbeCache } from '../../infrastructure/storage/remoteProviderProbeCache';
import { createSyncDocumentRuntime, type SyncDocumentDescriptor } from './documentSyncEngine';

export const providerProbeCacheSyncDescriptor = {
  id: 'provider-probe-cache',
  loadFallback: () => localProviderProbeCache.load(),
  saveFallback: (cache) => localProviderProbeCache.save(cache),
  loadRemote: () => remoteProviderProbeCache.load(),
  saveRemote: (cache) => remoteProviderProbeCache.save(cache),
  normalize: (cache) => normalizeProviderProbeCache(cache),
  messages: {
    loadRemoteFailed: 'Could not load provider probe cache from encrypted storage. Using local probe cache fallback.',
    saveRemoteFailed: 'Could not persist provider probe cache to encrypted storage. Local cache fallback was updated.'
  }
} satisfies SyncDocumentDescriptor<ProviderProbeCacheMap>;

const providerProbeCacheSync = createSyncDocumentRuntime(providerProbeCacheSyncDescriptor);

export function loadProviderProbeCache(): ProviderProbeCacheMap {
  return providerProbeCacheSync.loadFallback(undefined);
}

export function loadProviderProbeReport(settings: ProviderSettings): ProviderProbeReport | null {
  return getCachedProviderProbeReport(loadProviderProbeCache(), settings);
}

export async function loadProviderProbeReportFromDatabase(settings: ProviderSettings): Promise<ProviderProbeReport | null> {
  const map = await providerProbeCacheSync.loadFromRemote(undefined);
  return getCachedProviderProbeReport(map, settings);
}

export function saveProviderProbeReport(report: ProviderProbeReport) {
  providerProbeCacheSync.save(withCachedProviderProbeReport(loadProviderProbeCache(), report), undefined);
}

export function clearProviderProbeReport(settings: ProviderSettings) {
  providerProbeCacheSync.save(withoutCachedProviderProbeReport(loadProviderProbeCache(), settings), undefined);
}
