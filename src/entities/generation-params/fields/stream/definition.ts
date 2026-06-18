import type { GenerationParamFieldDefinition } from '../../types';
import { SelectParamField, type SelectParamFieldConfig } from '../shared/SelectParamField';
export default {
  id: 'generationParams.stream',
  Component: SelectParamField,
  defaultProps: { copyKey: 'stream', valueKey: 'stream', includeKey: 'includeStream', optionGroup: 'boolean' }
} satisfies GenerationParamFieldDefinition<SelectParamFieldConfig>;
