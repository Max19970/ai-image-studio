import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.output.compression',
  slot: 'composer/parameters/output',
  use: 'generationParams.outputCompression',
  order: 20,
  requiresCapability: 'output_compression'
};
