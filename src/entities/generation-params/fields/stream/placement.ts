import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.output.stream',
  slot: 'composer/parameters/output',
  use: 'generationParams.stream',
  order: 30,
  requiresCapability: 'stream'
};
