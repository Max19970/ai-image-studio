import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.render.style',
  slot: 'composer/parameters/render',
  use: 'generationParams.style',
  order: 40,
  requiresCapability: 'style'
};
