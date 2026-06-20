import { captureGenerationRequestParamsSnapshot, restoreImageParamsFromRequestSnapshot } from '../logicalRegistry';
import type { ProviderGenerationRequestSurface } from '../requestSurfaceTypes';
import { COMFYUI_SURFACE_ID, buildComfyUiPayload, createComfyUiParameterSummary, readComfyUiParamState, toComfyUiProviderParamState } from './state';

export const comfyUiGenerationRequestSurface: ProviderGenerationRequestSurface = {
  id: COMFYUI_SURFACE_ID,
  kind: 'provider-owned',
  buildPayload: ({ params, provider, providerMode }) => buildComfyUiPayload(params, provider, providerMode),
  captureParamsSnapshot: ({ params }) => captureGenerationRequestParamsSnapshot(params),
  captureProviderParamsSnapshot: ({ params, provider }) => toComfyUiProviderParamState(readComfyUiParamState(params, provider)),
  captureParameterSummary: ({ params, provider, providerMode }) => createComfyUiParameterSummary(readComfyUiParamState(params, provider), provider, providerMode),
  restoreParamsFromSnapshot: ({ previous, snapshot }) => restoreImageParamsFromRequestSnapshot(previous, snapshot)
};
