import { defineGenerationParam } from '../../defineParam';
import { parseOpenAiCompatibleRawJson } from '../../serializers/openAiCompatible';

export const rawJsonParam = defineGenerationParam({
  id: 'generationParam.rawJson',
  order: 999,
  fieldDefinitionId: 'generationParams.rawJson',
  placementIds: ['composer.params.service.rawJson'],
  i18nNamespace: 'params.rawJson',
  stateKeys: ['rawJson'],
  copy: { rawJson: { labelKey: 'params.rawJson', descriptionKey: 'params.rawJson.description' } },
  snapshotKeys: ['rawJson'],
  openAiCompatiblePayload: ({ params }) => parseOpenAiCompatibleRawJson(params.rawJson)
});
