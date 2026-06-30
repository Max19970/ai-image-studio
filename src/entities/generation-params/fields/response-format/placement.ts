import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.service.responseFormat',
  slot: 'composer/parameters/service',
  use: 'generationParams.responseFormat',
  order: 10,
  requiresCapability: 'response_format'
};
