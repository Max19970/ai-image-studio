import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.frame.n',
  slot: 'composer/parameters/frame',
  use: 'generationParams.n',
  order: 20,
  requiresCapability: 'n'
};
