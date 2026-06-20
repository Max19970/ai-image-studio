import type { ImageParams } from '../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { openAiCompatibleGenerationParamProfile } from '../../providers/openai-compatible/parameterProfile';
import { buildOpenAiCompatibleParamPayload } from './logicalRegistry';

export function buildOpenAiCompatibleRequestSurfacePayload(params: ImageParams, provider: ProviderSettings, mode: WorkMode, providerMode?: ProviderGenerationModeDefinition | null): Record<string, unknown> {
  return {
    prompt: params.prompt.trim(),
    ...buildOpenAiCompatibleParamPayload(params, provider, mode, openAiCompatibleGenerationParamProfile, providerMode)
  };
}
