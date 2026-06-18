import type { GenerationParamDefinition } from './types';

export function defineGenerationParam<const TDefinition extends GenerationParamDefinition>(definition: TDefinition): TDefinition {
  return definition;
}
