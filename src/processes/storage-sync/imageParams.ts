import type { ImageParams } from '../../domain/imageParams';
import { normalizeImageParams } from '../../entities/image-params';
import { localImageParamsStore } from '../../infrastructure/storage/localImageParamsStore';
import { remoteImageParamsStore } from '../../infrastructure/storage/remoteImageParamsStore';
import type { SyncDocumentDescriptor } from './documentSyncEngine';

export interface ImageParamsFallbackStore {
  load(): ImageParams;
  save(params: ImageParams): void;
}

export interface ImageParamsRemoteStore {
  load(): Promise<ImageParams>;
  save(params: ImageParams): Promise<void>;
}

export function createImageParamsSyncDescriptor(stores: {
  fallback: ImageParamsFallbackStore;
  remote: ImageParamsRemoteStore;
}): SyncDocumentDescriptor<ImageParams> {
  return {
    id: 'image-params',
    loadFallback: () => stores.fallback.load(),
    saveFallback: (params) => stores.fallback.save(params),
    loadRemote: () => stores.remote.load(),
    saveRemote: (params) => stores.remote.save(params),
    normalize: (params) => normalizeImageParams(params),
    messages: {
      loadRemoteFailed: 'Could not load image params from encrypted storage. Using local params fallback.',
      saveRemoteFailed: 'Could not persist image params to encrypted storage. Local params fallback was updated.'
    }
  };
}

export const imageParamsSyncDescriptor = createImageParamsSyncDescriptor({
  fallback: localImageParamsStore,
  remote: remoteImageParamsStore
});
