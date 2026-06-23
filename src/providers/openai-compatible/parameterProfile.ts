import type { ProviderGenerationParamProfile } from '../../entities/generation-params/types';

export const openAiCompatibleGenerationParamProfile = {
  id: 'openai-compatible.default',
  include: 'all',
  byMode: {
    edit: 'all'
  },
  isAvailable: ({ mode, definition, current }) => {
    if (mode === 'edit' && (definition.id === 'generationParam.quality' || definition.id === 'generationParam.moderation')) {
      return false;
    }
    return current;
  }
} satisfies ProviderGenerationParamProfile;
