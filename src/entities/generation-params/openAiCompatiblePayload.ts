import type { ImageParams } from '../../domain/imageParams';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { openAiCompatibleGenerationParamProfile } from '../../providers/openai-compatible/parameterProfile';
import { buildOpenAiCompatibleParamPayload } from './logicalRegistry';

export function buildOpenAiCompatibleRequestSurfacePayload(params: ImageParams, provider: ProviderSettings, mode: WorkMode): Record<string, unknown> {
  return {
    prompt: params.prompt.trim(),
    ...buildOpenAiCompatibleParamPayload(params, provider, mode, openAiCompatibleGenerationParamProfile)
  };
}
