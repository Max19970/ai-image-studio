import { normalizeProviderProbeCache, type ProviderProbeCacheMap } from '../../entities/provider-probe-cache';
import { localProviderProbeCache } from '../../infrastructure/storage/localProviderProbeCache';
import { remoteProviderProbeCache } from '../../infrastructure/storage/remoteProviderProbeCache';
import type { SyncDocumentDescriptor } from './documentSyncEngine';

export interface ProviderProbeCacheFallbackStore {
  load(): ProviderProbeCacheMap;
  save(cache: ProviderProbeCacheMap): void;
}

export interface ProviderProbeCacheRemoteStore {
  load(): Promise<ProviderProbeCacheMap>;
  save(cache: ProviderProbeCacheMap): Promise<void>;
}

export function createProviderProbeCacheSyncDescriptor(stores: {
  fallback: ProviderProbeCacheFallbackStore;
  remote: ProviderProbeCacheRemoteStore;
}): SyncDocumentDescriptor<ProviderProbeCacheMap> {
  return {
    id: 'provider-probe-cache',
    loadFallback: () => stores.fallback.load(),
    saveFallback: (cache) => stores.fallback.save(cache),
    loadRemote: () => stores.remote.load(),
    saveRemote: (cache) => stores.remote.save(cache),
    normalize: (cache) => normalizeProviderProbeCache(cache),
    messages: {
      loadRemoteFailed: 'Could not load provider probe cache from encrypted storage. Using local probe cache fallback.',
      saveRemoteFailed: 'Could not persist provider probe cache to encrypted storage. Local cache fallback was updated.'
    }
  };
}

export const providerProbeCacheSyncDescriptor = createProviderProbeCacheSyncDescriptor({
  fallback: localProviderProbeCache,
  remote: remoteProviderProbeCache
});
