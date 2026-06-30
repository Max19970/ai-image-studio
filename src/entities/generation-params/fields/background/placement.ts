import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.render.background',
  slot: 'composer/parameters/render',
  use: 'generationParams.background',
  order: 20,
  requiresCapability: 'background'
};
