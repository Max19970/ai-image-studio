import type { ImageParams } from '../../domain/imageParams';
import { normalizeImageParams } from '../../entities/image-params';
import { localImageParamsStore } from '../../infrastructure/storage/localImageParamsStore';
import { remoteImageParamsStore } from '../../infrastructure/storage/remoteImageParamsStore';
import { createSyncDocumentRuntime, voidContext, type SyncDocumentDescriptor } from './documentSyncEngine';

export const imageParamsSyncDescriptor = {
  id: 'image-params',
  loadFallback: () => localImageParamsStore.load(),
  saveFallback: (params) => localImageParamsStore.save(params),
  loadRemote: () => remoteImageParamsStore.load(),
  saveRemote: (params) => remoteImageParamsStore.save(params),
  normalize: (params) => normalizeImageParams(params),
  messages: {
    loadRemoteFailed: 'Could not load image params from encrypted storage. Using local params fallback.',
    saveRemoteFailed: 'Could not persist image params to encrypted storage. Local params fallback was updated.'
  }
} satisfies SyncDocumentDescriptor<ImageParams>;

const imageParamsSync = createSyncDocumentRuntime(imageParamsSyncDescriptor);

export function loadImageParams(): ImageParams {
  return imageParamsSync.loadFallback(voidContext());
}

export function loadImageParamsFromDatabase(): Promise<ImageParams> {
  return imageParamsSync.loadFromRemote(voidContext());
}

export function saveImageParams(params: ImageParams) {
  imageParamsSync.save(params, voidContext());
}
