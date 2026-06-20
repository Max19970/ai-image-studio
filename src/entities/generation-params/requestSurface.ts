import type { ProviderSettings } from '../../domain/providerSettings';
import { openAiCompatibleGenerationParamProfile } from '../../providers/openai-compatible/parameterProfile';
import { getProviderAdapterForSettings } from '../provider/registry';
import { comfyUiGenerationRequestSurface } from './comfyui/requestSurface';
import { captureGenerationRequestParamsSnapshot, restoreImageParamsFromRequestSnapshot } from './logicalRegistry';
import { buildOpenAiCompatibleRequestSurfacePayload } from './openAiCompatiblePayload';
import type {
  ProviderGenerationRequestSurface,
  ProviderGenerationRequestSurfacePayloadContext,
  ProviderGenerationRequestSurfaceRestoreContext,
  ProviderGenerationRequestSurfaceSnapshotContext
} from './requestSurfaceTypes';

export { buildOpenAiCompatibleRequestSurfacePayload } from './openAiCompatiblePayload';

export type {
  ProviderGenerationRequestSurface,
  ProviderGenerationRequestSurfacePayloadContext,
  ProviderGenerationRequestSurfaceRestoreContext,
  ProviderGenerationRequestSurfaceSnapshotContext
} from './requestSurfaceTypes';

export const openAiCompatibleGenerationRequestSurface: ProviderGenerationRequestSurface = {
  id: 'openai-compatible.logical-params',
  kind: 'logical-params',
  buildPayload: ({ params, provider, mode }) => buildOpenAiCompatibleRequestSurfacePayload(params, provider, mode),
  captureParamsSnapshot: ({ params, provider, mode }) => captureGenerationRequestParamsSnapshot(params, provider, mode, openAiCompatibleGenerationParamProfile),
  captureProviderParamsSnapshot: () => undefined,
  captureParameterSummary: () => undefined,
  restoreParamsFromSnapshot: ({ previous, snapshot }) => restoreImageParamsFromRequestSnapshot(previous, snapshot)
};

export const providerGenerationRequestSurfaces = [openAiCompatibleGenerationRequestSurface, comfyUiGenerationRequestSurface] satisfies ProviderGenerationRequestSurface[];
export const providerGenerationRequestSurfacesById = new Map(providerGenerationRequestSurfaces.map((surface) => [surface.id, surface]));

export function getProviderGenerationRequestSurfaceById(surfaceId: string | null | undefined): ProviderGenerationRequestSurface {
  if (!surfaceId) return openAiCompatibleGenerationRequestSurface;
  return providerGenerationRequestSurfacesById.get(surfaceId) ?? openAiCompatibleGenerationRequestSurface;
}

export function getProviderGenerationRequestSurface(provider: Pick<ProviderSettings, 'adapterId'> | null | undefined): ProviderGenerationRequestSurface {
  const surfaceId = getProviderAdapterForSettings(provider).generationSurface.id;
  return getProviderGenerationRequestSurfaceById(surfaceId);
}
