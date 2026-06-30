import type { GenerationParamFieldPlacement } from '../../types';

export const placement: GenerationParamFieldPlacement = {
  id: 'composer.params.retry.policy',
  slot: 'composer/parameters/retry',
  use: 'generationParams.retryPolicy',
  order: 10
};
