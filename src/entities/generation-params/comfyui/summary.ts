import type { ProviderRequestParameterSummary } from '../../../domain/generationTask';
import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../../domain/providerMode';
import type { ProviderSettings } from '../../../domain/providerSettings';
import type { WorkMode } from '../../../domain/workMode';
import { captureGenerationExtensionSummaryEntries } from '../extensionTypes';
import { comfyUiPayloadExtensions } from './extensions/payloadRegistry';
import { createComfyUiBaseParameterSummary, readComfyUiParamState } from './state';

export function createComfyUiParameterSummaryFromParams(
  params: ImageParams,
  provider: ProviderSettings,
  providerMode?: ProviderGenerationModeDefinition | null,
  mode: WorkMode = 'generate',
  payload: Record<string, unknown> = {}
): ProviderRequestParameterSummary {
  const state = readComfyUiParamState(params, provider);
  const base = createComfyUiBaseParameterSummary(state, provider, providerMode);
  return {
    ...base,
    entries: [
      ...base.entries,
      ...captureGenerationExtensionSummaryEntries(comfyUiPayloadExtensions, {
        params,
        provider,
        mode,
        providerMode: providerMode as any,
        payload
      })
    ]
  };
}
