import { defineGenerationParam } from '../../defineParam';
import { isBlank } from '../../serializers/openAiCompatible';

export const userParam = defineGenerationParam({
  id: 'generationParam.user',
  fieldDefinitionId: 'generationParams.user',
  placementIds: ['composer.params.service.user'],
  i18nNamespace: 'params.user',
  stateKeys: ['user', 'includeUser'],
  copy: { user: { labelKey: 'params.user', descriptionKey: 'params.user.description' } },
  capability: 'user',
  includeKey: 'includeUser',
  payloadKeys: ['user'],
  snapshotKeys: ['user'],
  openAiCompatiblePayload: ({ params }) => params.includeUser && !isBlank(params.user) ? { user: params.user.trim() } : {}
});
