import type { GenerationParamFieldDefinition } from '../../types';
import { SelectParamField, type SelectParamFieldConfig } from '../shared/SelectParamField';
export default {
  id: 'generationParams.moderation',
  Component: SelectParamField,
  defaultProps: { copyKey: 'moderation', valueKey: 'moderation', includeKey: 'includeModeration', optionGroup: 'moderation' }
} satisfies GenerationParamFieldDefinition<SelectParamFieldConfig>;
