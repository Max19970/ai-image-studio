import { defineGenerationParam } from '../../defineParam';
import { shouldSendOutputFormat } from '../../serializers/openAiCompatible';

export const outputFormatParam = defineGenerationParam({
  id: 'generationParam.outputFormat',
  fieldDefinitionId: 'generationParams.outputFormat',
  placementIds: ['composer.params.output.format'],
  i18nNamespace: 'params.outputFormat',
  stateKeys: ['outputFormat', 'includeOutputFormat'],
  copy: { outputFormat: { labelKey: 'params.outputFormat', descriptionKey: 'params.outputFormat.description' } },
  options: {
    outputFormat: [
      { value: 'png', label: 'png' },
      { value: 'jpeg', label: 'jpeg' },
      { value: 'webp', label: 'webp' }
    ]
  },
  capability: 'output_format',
  includeKey: 'includeOutputFormat',
  payloadKeys: ['output_format'],
  snapshotKeys: ['outputFormat'],
  openAiCompatiblePayload: ({ params }) => params.includeOutputFormat && shouldSendOutputFormat(params.outputFormat) ? { output_format: params.outputFormat } : {}
});
