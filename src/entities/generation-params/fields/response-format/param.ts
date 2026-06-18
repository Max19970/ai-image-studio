import { defineGenerationParam } from '../../defineParam';
import { isBlank } from '../../serializers/openAiCompatible';

export const responseFormatParam = defineGenerationParam({
  id: 'generationParam.responseFormat',
  fieldDefinitionId: 'generationParams.responseFormat',
  placementIds: ['composer.params.service.responseFormat'],
  i18nNamespace: 'params.responseFormat',
  stateKeys: ['responseFormat', 'includeResponseFormat'],
  copy: { responseFormat: { labelKey: 'params.responseFormat', descriptionKey: 'params.responseFormat.description' } },
  options: {
    responseFormat: [
      { value: '', labelKey: 'params.option.omit' },
      { value: 'b64_json', label: 'b64_json' },
      { value: 'url', label: 'url' }
    ]
  },
  capability: 'response_format',
  includeKey: 'includeResponseFormat',
  payloadKeys: ['response_format'],
  snapshotKeys: ['responseFormat'],
  openAiCompatiblePayload: ({ params }) => params.includeResponseFormat && !isBlank(params.responseFormat) ? { response_format: params.responseFormat } : {}
});
