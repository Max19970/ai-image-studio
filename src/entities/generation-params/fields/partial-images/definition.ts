import type { GenerationParamFieldDefinition } from '../../types';
import { NumberParamField, type NumberParamFieldConfig } from '../shared/NumberParamField';
export default {
  id: 'generationParams.partialImages',
  Component: NumberParamField,
  defaultProps: { copyKey: 'partialImages', valueKey: 'partialImages', includeKey: 'includePartialImages', min: 0, max: 3, round: true }
} satisfies GenerationParamFieldDefinition<NumberParamFieldConfig>;
