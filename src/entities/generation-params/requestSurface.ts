import type { ImageParams } from '../../domain/imageParams';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { openAiCompatibleGenerationParamProfile } from '../../providers/openai-compatible/parameterProfile';
import { comfyUiGenerationRequestSurface } from './comfyui/requestSurface';
import { buildOpenAiCompatibleParamPayload, captureGenerationRequestParamsSnapshot, restoreImageParamsFromRequestSnapshot } from './logicalRegistry';
import type {
  ProviderGenerationRequestSurface,
  ProviderGenerationRequestSurfacePayloadContext,
  ProviderGenerationRequestSurfaceRestoreContext,
  ProviderGenerationRequestSurfaceSnapshotContext
} from './requestSurfaceTypes';

export type {
  ProviderGenerationRequestSurface,
  ProviderGenerationRequestSurfacePayloadContext,
  ProviderGenerationRequestSurfaceRestoreContext,
  ProviderGenerationRequestSurfaceSnapshotContext
} from './requestSurfaceTypes';

export function buildOpenAiCompatibleRequestSurfacePayload(params: ImageParams, provider: ProviderSettings, mode: WorkMode): Record<string, unknown> {
  return {
    prompt: params.prompt.trim(),
    ...buildOpenAiCompatibleParamPayload(params, provider, mode, openAiCompatibleGenerationParamProfile)
  };
}

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
  if (provider?.adapterId === 'comfyui') return comfyUiGenerationRequestSurface;
  return openAiCompatibleGenerationRequestSurface;
}
