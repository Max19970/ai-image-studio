import { defaultImageParams } from '../../domain/defaults';
import type { ImageParams } from '../../domain/imageParams';
import { normalizeImageParams } from '../../entities/image-params';
import { loadRemoteAppDocument, saveRemoteAppDocument } from './remoteAppDocumentStore';

export const imageParamsStorageEndpoint = '/api/storage/image-params';

export const remoteImageParamsStore = {
  async load(): Promise<ImageParams> {
    return normalizeImageParams(await loadRemoteAppDocument<Partial<ImageParams> | null>(imageParamsStorageEndpoint, defaultImageParams));
  },

  async save(params: ImageParams): Promise<void> {
    await saveRemoteAppDocument(imageParamsStorageEndpoint, 'params', normalizeImageParams(params));
  }
};
