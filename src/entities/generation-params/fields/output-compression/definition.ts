import type { GenerationParamFieldDefinition } from '../../types';
import { NumberParamField, type NumberParamFieldConfig } from '../shared/NumberParamField';
export default {
  id: 'generationParams.outputCompression',
  Component: NumberParamField,
  defaultProps: { copyKey: 'compression', valueKey: 'outputCompression', includeKey: 'includeOutputCompression', min: 0, max: 100 }
} satisfies GenerationParamFieldDefinition<NumberParamFieldConfig>;
