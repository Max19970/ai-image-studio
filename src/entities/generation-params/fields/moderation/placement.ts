import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.render.moderation',
  slot: 'composer/parameters/render',
  use: 'generationParams.moderation',
  order: 30,
  requiresCapability: 'moderation'
};
