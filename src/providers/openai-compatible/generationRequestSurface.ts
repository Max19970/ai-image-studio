import { captureGenerationRequestParamsSnapshot, restoreImageParamsFromRequestSnapshot } from '../../entities/generation-params/logicalRegistry';
import { buildOpenAiCompatibleRequestSurfacePayload } from '../../entities/generation-params/openAiCompatiblePayload';
import type { ProviderGenerationRequestSurface } from '../../entities/generation-params/requestSurfaceTypes';
import { openAiCompatibleGenerationParamProfile } from './parameterProfile';

export const openAiCompatibleGenerationRequestSurface: ProviderGenerationRequestSurface = {
  id: 'openai-compatible.logical-params',
  kind: 'logical-params',
  buildPayload: ({ params, provider, mode, providerMode }) => buildOpenAiCompatibleRequestSurfacePayload(params, provider, mode, providerMode),
  captureParamsSnapshot: ({ params, provider, mode, providerMode }) => captureGenerationRequestParamsSnapshot(params, provider, mode, openAiCompatibleGenerationParamProfile, providerMode),
  captureProviderParamsSnapshot: () => undefined,
  captureParameterSummary: () => undefined,
  restoreParamsFromSnapshot: ({ previous, snapshot }) => restoreImageParamsFromRequestSnapshot(previous, snapshot)
};

export const providerGenerationRequestSurface = openAiCompatibleGenerationRequestSurface;
