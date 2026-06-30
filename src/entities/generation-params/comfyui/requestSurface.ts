import { captureGenerationRequestParamsSnapshot, restoreImageParamsFromRequestSnapshot } from '../logicalRegistry';
import type { ProviderGenerationRequestSurface } from '../requestSurfaceTypes';
import { buildComfyUiPayload } from './payload';
import { createComfyUiParameterSummaryFromParams } from './summary';
import { COMFYUI_SURFACE_ID, readComfyUiParamState } from './state';
import { toComfyUiProviderParamState } from './stateSerializers';

export const comfyUiGenerationRequestSurface: ProviderGenerationRequestSurface = {
  id: COMFYUI_SURFACE_ID,
  kind: 'provider-owned',
  buildPayload: ({ params, provider, mode, providerMode }) => buildComfyUiPayload(params, provider, providerMode, mode),
  captureParamsSnapshot: ({ params }) => captureGenerationRequestParamsSnapshot(params),
  captureProviderParamsSnapshot: ({ params, provider }) => toComfyUiProviderParamState(readComfyUiParamState(params, provider)),
  captureParameterSummary: ({ params, provider, mode, providerMode, payload }) => createComfyUiParameterSummaryFromParams(params, provider, providerMode, mode, payload),
  restoreParamsFromSnapshot: ({ previous, snapshot }) => restoreImageParamsFromRequestSnapshot(previous, snapshot)
};
