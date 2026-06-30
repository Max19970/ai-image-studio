import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.output.partialImages',
  slot: 'composer/parameters/output',
  use: 'generationParams.partialImages',
  order: 40,
  requiresCapability: 'partial_images'
};
