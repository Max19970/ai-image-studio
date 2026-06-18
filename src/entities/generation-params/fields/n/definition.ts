import type { GenerationParamFieldDefinition } from '../../types';
import { NumberParamField, type NumberParamFieldConfig } from '../shared/NumberParamField';
export default {
  id: 'generationParams.n',
  Component: NumberParamField,
  defaultProps: { copyKey: 'n', valueKey: 'n', includeKey: 'includeN', min: 1, max: 10, round: true }
} satisfies GenerationParamFieldDefinition<NumberParamFieldConfig>;
