import type { GenerationParamFieldDefinition } from '../../types';
import { SelectParamField, type SelectParamFieldConfig } from '../shared/SelectParamField';
export default {
  id: 'generationParams.inputFidelity',
  Component: SelectParamField,
  defaultProps: { copyKey: 'inputFidelity', valueKey: 'inputFidelity', includeKey: 'includeInputFidelity', optionGroup: 'inputFidelity' }
} satisfies GenerationParamFieldDefinition<SelectParamFieldConfig>;
