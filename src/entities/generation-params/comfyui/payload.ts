import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../../domain/providerMode';
import type { ProviderSettings } from '../../../domain/providerSettings';
import type { WorkMode } from '../../../domain/workMode';
import { buildGenerationExtensionPayload } from '../extensionTypes';
import { buildComfyUiBasePayload } from './state';
import { comfyUiPayloadExtensions } from './extensions/payloadRegistry';

export function buildComfyUiPayload(
  params: ImageParams,
  provider: ProviderSettings,
  providerMode?: ProviderGenerationModeDefinition | null,
  mode: WorkMode = 'generate'
): Record<string, unknown> {
  return {
    ...buildComfyUiBasePayload(params, provider, providerMode),
    ...buildGenerationExtensionPayload(comfyUiPayloadExtensions, {
      params,
      provider,
      mode,
      providerMode: providerMode as any
    })
  };
}
