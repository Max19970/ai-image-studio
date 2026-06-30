import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.service.user',
  slot: 'composer/parameters/service',
  use: 'generationParams.user',
  order: 20,
  requiresCapability: 'user'
};
