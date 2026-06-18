import { defineGenerationParam } from '../../defineParam';

export const includeModelParam = defineGenerationParam({
  id: 'generationParam.includeModel',
  fieldDefinitionId: 'generationParams.includeModel',
  placementIds: ['composer.params.service.includeModel'],
  i18nNamespace: 'params.includeModel',
  stateKeys: ['includeModel'],
  copy: { includeModel: { labelKey: 'params.includeModel', descriptionKey: 'params.includeModel.description' } },
  includeKey: 'includeModel',
  payloadKeys: ['model'],
  openAiCompatiblePayload: ({ params, provider }) => params.includeModel && provider.modelId.trim() ? { model: provider.modelId.trim() } : {}
});
