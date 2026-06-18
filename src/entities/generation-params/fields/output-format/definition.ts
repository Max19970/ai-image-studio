import type { GenerationParamFieldDefinition } from '../../types';
import { SelectParamField, type SelectParamFieldConfig } from '../shared/SelectParamField';
export default {
  id: 'generationParams.outputFormat',
  Component: SelectParamField,
  defaultProps: { copyKey: 'outputFormat', valueKey: 'outputFormat', includeKey: 'includeOutputFormat', optionGroup: 'outputFormat' }
} satisfies GenerationParamFieldDefinition<SelectParamFieldConfig>;
