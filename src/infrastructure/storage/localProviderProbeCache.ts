import type { ProviderProbeReport } from '../../domain/providerProbe';
import type { ProviderProbeCacheMap } from '../../entities/provider-probe-cache';
import { normalizeProviderProbeCache } from '../../entities/provider-probe-cache';
import { readLocalJson, writeLocalJson } from './localJson';

export const providerProbeCacheStorageKey = 'gpt-image-2-studio.probe-cache.v1';

export const localProviderProbeCache = {
  load(): ProviderProbeCacheMap {
    return normalizeProviderProbeCache(readLocalJson<unknown>(providerProbeCacheStorageKey, {}));
  },

  save(map: ProviderProbeCacheMap) {
    writeLocalJson(providerProbeCacheStorageKey, map);
  },

  upsert(report: ProviderProbeReport) {
    const map = this.load();
    map[report.fingerprint] = report;
    this.save(map);
  }
};
