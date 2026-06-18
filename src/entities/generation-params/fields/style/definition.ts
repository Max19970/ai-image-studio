import type { GenerationParamFieldDefinition } from '../../types';
import { SelectParamField, type SelectParamFieldConfig } from '../shared/SelectParamField';
export default {
  id: 'generationParams.style',
  Component: SelectParamField,
  defaultProps: { copyKey: 'style', valueKey: 'style', includeKey: 'includeStyle', optionGroup: 'style' }
} satisfies GenerationParamFieldDefinition<SelectParamFieldConfig>;
