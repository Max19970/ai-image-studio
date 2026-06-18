import { defineGenerationParam } from '../../defineParam';
import { shouldSendOutputFormat } from '../../serializers/openAiCompatible';

export const outputCompressionParam = defineGenerationParam({
  id: 'generationParam.outputCompression',
  fieldDefinitionId: 'generationParams.outputCompression',
  placementIds: ['composer.params.output.compression'],
  i18nNamespace: 'params.outputCompression',
  stateKeys: ['outputCompression', 'includeOutputCompression'],
  copy: { compression: { labelKey: 'params.compression', descriptionKey: 'params.compression.description' } },
  capability: 'output_compression',
  includeKey: 'includeOutputCompression',
  payloadKeys: ['output_compression'],
  snapshotKeys: ['outputCompression'],
  normalize: ({ current, defaults }) => ({ outputCompression: Math.max(0, Math.min(100, Number(current.outputCompression ?? defaults.outputCompression) || 0)) }),
  openAiCompatiblePayload: ({ params }) => params.includeOutputCompression && shouldSendOutputFormat(params.outputFormat) ? { output_compression: params.outputCompression } : {}
});
