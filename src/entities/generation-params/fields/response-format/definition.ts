import type { GenerationParamFieldDefinition } from '../../types';
import { SelectParamField, type SelectParamFieldConfig } from '../shared/SelectParamField';
export default {
  id: 'generationParams.responseFormat',
  Component: SelectParamField,
  defaultProps: { copyKey: 'responseFormat', valueKey: 'responseFormat', includeKey: 'includeResponseFormat', optionGroup: 'responseFormat' }
} satisfies GenerationParamFieldDefinition<SelectParamFieldConfig>;
