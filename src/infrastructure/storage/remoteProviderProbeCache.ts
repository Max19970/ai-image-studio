import type { ProviderProbeCacheMap } from '../../entities/provider-probe-cache';
import { normalizeProviderProbeCache } from '../../entities/provider-probe-cache';
import { deleteRemoteAppDocument, loadRemoteAppDocument, saveRemoteAppDocument } from './remoteAppDocumentStore';

export const providerProbeCacheStorageEndpoint = '/api/storage/provider-probe-cache';

export const remoteProviderProbeCache = {
  async load(): Promise<ProviderProbeCacheMap> {
    return normalizeProviderProbeCache(await loadRemoteAppDocument<unknown>(providerProbeCacheStorageEndpoint, {}));
  },

  async save(map: ProviderProbeCacheMap): Promise<void> {
    await saveRemoteAppDocument(providerProbeCacheStorageEndpoint, 'cache', map);
  },

  async clear(): Promise<void> {
    await deleteRemoteAppDocument(providerProbeCacheStorageEndpoint);
  }
};
