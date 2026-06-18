import { defaultImageParams } from '../../domain/defaults';
import type { ImageParams } from '../../domain/imageParams';
import { normalizeImageParams } from '../../entities/image-params';
import { readLocalJson, writeLocalJson } from './localJson';

export const imageParamsStorageKey = 'gpt-image-2-studio.params.v2';

export const localImageParamsStore = {
  load(): ImageParams {
    return normalizeImageParams(readLocalJson<Partial<ImageParams>>(imageParamsStorageKey, defaultImageParams));
  },

  save(params: ImageParams) {
    writeLocalJson(imageParamsStorageKey, normalizeImageParams(params));
  }
};
