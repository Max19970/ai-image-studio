import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.output.format',
  slot: 'composer/parameters/output',
  use: 'generationParams.outputFormat',
  order: 10,
  requiresCapability: 'output_format'
};
