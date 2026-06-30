import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.service.includeModel',
  slot: 'composer/parameters/service',
  use: 'generationParams.includeModel',
  order: 30
};
