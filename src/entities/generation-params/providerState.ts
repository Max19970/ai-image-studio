import type { ImageParams } from '../../domain/imageParams';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { ProviderParamState, ProviderParamStateBucket } from './surfaceTypes';

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function getProviderParamStateKey(provider: Pick<ProviderSettings, 'adapterId'> | null | undefined): string {
  return provider?.adapterId || 'openai-compatible';
}

export function readProviderParamBucket(params: Pick<ImageParams, 'providerParams'> | null | undefined): ProviderParamStateBucket {
  if (!isPlainRecord(params?.providerParams)) return {};
  return Object.entries(params.providerParams).reduce<ProviderParamStateBucket>((bucket, [key, value]) => {
    if (isPlainRecord(value)) bucket[key] = value;
    return bucket;
  }, {});
}

export function readProviderParamState(params: ImageParams, provider: ProviderSettings, fallback: ProviderParamState = {}): ProviderParamState {
  const state = readProviderParamBucket(params)[getProviderParamStateKey(provider)];
  return isPlainRecord(state) ? state : fallback;
}

export function writeProviderParamState(params: ImageParams, provider: ProviderSettings, next: ProviderParamState): ImageParams {
  return {
    ...params,
    providerParams: {
      ...readProviderParamBucket(params),
      [getProviderParamStateKey(provider)]: next
    }
  };
}

export function normalizeProviderParamBucket(value: unknown): ProviderParamStateBucket {
  if (!isPlainRecord(value)) return {};
  return Object.entries(value).reduce<ProviderParamStateBucket>((bucket, [key, item]) => {
    if (isPlainRecord(item)) bucket[key] = { ...item };
    return bucket;
  }, {});
}
