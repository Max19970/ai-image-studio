import { defineGenerationParam } from '../../defineParam';
import { isBlank } from '../../serializers/openAiCompatible';

export const styleParam = defineGenerationParam({
  id: 'generationParam.style',
  fieldDefinitionId: 'generationParams.style',
  placementIds: ['composer.params.render.style'],
  i18nNamespace: 'params.style',
  stateKeys: ['style', 'includeStyle'],
  copy: { style: { labelKey: 'params.style', descriptionKey: 'params.style.description' } },
  options: {
    style: [
      { value: '', labelKey: 'params.option.omit' },
      { value: 'vivid', label: 'vivid' },
      { value: 'natural', label: 'natural' }
    ]
  },
  capability: 'style',
  includeKey: 'includeStyle',
  payloadKeys: ['style'],
  snapshotKeys: ['style'],
  openAiCompatiblePayload: ({ params }) => params.includeStyle && !isBlank(params.style) ? { style: params.style } : {}
});
