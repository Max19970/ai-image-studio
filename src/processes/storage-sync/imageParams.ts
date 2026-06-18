import type { ImageParams } from '../../domain/imageParams';
import { normalizeImageParams } from '../../entities/image-params';
import { localImageParamsStore } from '../../infrastructure/storage/localImageParamsStore';
import { remoteImageParamsStore } from '../../infrastructure/storage/remoteImageParamsStore';

export function loadImageParams(): ImageParams {
  return localImageParamsStore.load();
}

export async function loadImageParamsFromDatabase(): Promise<ImageParams> {
  try {
    const params = normalizeImageParams(await remoteImageParamsStore.load());
    localImageParamsStore.save(params);
    return params;
  } catch (error) {
    console.warn('Could not load image params from encrypted storage. Using local params fallback.', error);
    return loadImageParams();
  }
}

export function saveImageParams(params: ImageParams) {
  const safeParams = normalizeImageParams(params);
  localImageParamsStore.save(safeParams);
  void remoteImageParamsStore.save(safeParams).catch((error) => {
    console.warn('Could not persist image params to encrypted storage. Local params fallback was updated.', error);
  });
}
