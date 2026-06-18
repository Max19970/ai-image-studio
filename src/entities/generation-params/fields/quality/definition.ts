import type { GenerationParamFieldDefinition } from '../../types';
import { SelectParamField, type SelectParamFieldConfig } from '../shared/SelectParamField';
export default {
  id: 'generationParams.quality',
  Component: SelectParamField,
  defaultProps: { copyKey: 'quality', valueKey: 'quality', includeKey: 'includeQuality', optionGroup: 'quality' }
} satisfies GenerationParamFieldDefinition<SelectParamFieldConfig>;
