import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.render.quality',
  slot: 'composer/parameters/render',
  use: 'generationParams.quality',
  order: 10,
  requiresCapability: 'quality'
};
