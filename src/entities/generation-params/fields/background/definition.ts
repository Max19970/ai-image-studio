import type { GenerationParamFieldDefinition } from '../../types';
import { SelectParamField, type SelectParamFieldConfig } from '../shared/SelectParamField';
export default {
  id: 'generationParams.background',
  Component: SelectParamField,
  defaultProps: { copyKey: 'background', valueKey: 'background', includeKey: 'includeBackground', optionGroup: 'background' }
} satisfies GenerationParamFieldDefinition<SelectParamFieldConfig>;
