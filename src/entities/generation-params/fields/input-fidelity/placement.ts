import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.render.inputFidelity',
  slot: 'composer/parameters/render',
  use: 'generationParams.inputFidelity',
  order: 50,
  mode: 'edit',
  requiresCapability: 'input_fidelity'
};
