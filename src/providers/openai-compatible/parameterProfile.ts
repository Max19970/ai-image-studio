import type { ProviderGenerationParamProfile } from '../../entities/generation-params/types';

export const openAiCompatibleGenerationParamProfile = {
  id: 'openai-compatible.default',
  include: 'all'
} satisfies ProviderGenerationParamProfile;
