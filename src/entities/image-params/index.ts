import type { ImageParams } from '../../domain/imageParams';
import { normalizeImageParamsFromDefinitions } from '../generation-params/logicalRegistry';

export function normalizeImageParams(value: Partial<ImageParams> | null | undefined): ImageParams {
  return normalizeImageParamsFromDefinitions(value);
}
