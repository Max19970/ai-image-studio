import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderSettings } from '../../domain/providerSettings';
import { getCachedProviderProbeReport, normalizeProviderProbeCache, withoutCachedProviderProbeReport, withCachedProviderProbeReport } from '../../entities/provider-probe-cache';
import { localProviderProbeCache } from '../../infrastructure/storage/localProviderProbeCache';
import { remoteProviderProbeCache } from '../../infrastructure/storage/remoteProviderProbeCache';

export function loadProviderProbeReport(settings: ProviderSettings): ProviderProbeReport | null {
  return getCachedProviderProbeReport(localProviderProbeCache.load(), settings);
}

export async function loadProviderProbeReportFromDatabase(settings: ProviderSettings): Promise<ProviderProbeReport | null> {
  try {
    const map = normalizeProviderProbeCache(await remoteProviderProbeCache.load());
    localProviderProbeCache.save(map);
    return getCachedProviderProbeReport(map, settings);
  } catch (error) {
    console.warn('Could not load provider probe cache from encrypted storage. Using local probe cache fallback.', error);
    return loadProviderProbeReport(settings);
  }
}

export function saveProviderProbeReport(report: ProviderProbeReport) {
  const map = withCachedProviderProbeReport(localProviderProbeCache.load(), report);
  localProviderProbeCache.save(map);
  void remoteProviderProbeCache.save(map).catch((error) => {
    console.warn('Could not persist provider probe cache to encrypted storage. Local cache fallback was updated.', error);
  });
}

export function clearProviderProbeReport(settings: ProviderSettings) {
  const map = withoutCachedProviderProbeReport(localProviderProbeCache.load(), settings);
  localProviderProbeCache.save(map);
  void remoteProviderProbeCache.save(map).catch((error) => {
    console.warn('Could not persist provider probe cache removal to encrypted storage. Local cache fallback was updated.', error);
  });
}
