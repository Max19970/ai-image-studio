import { defineGenerationParam } from '../../defineParam';
import { isAuto } from '../../serializers/openAiCompatible';

export const moderationParam = defineGenerationParam({
  id: 'generationParam.moderation',
  fieldDefinitionId: 'generationParams.moderation',
  placementIds: ['composer.params.render.moderation'],
  i18nNamespace: 'params.moderation',
  stateKeys: ['moderation', 'includeModeration'],
  copy: { moderation: { labelKey: 'params.moderation', descriptionKey: 'params.moderation.description' } },
  options: {
    moderation: [
      { value: '', labelKey: 'params.option.omit' },
      { value: 'auto', label: 'auto' },
      { value: 'low', label: 'low' }
    ]
  },
  capability: 'moderation',
  includeKey: 'includeModeration',
  payloadKeys: ['moderation'],
  snapshotKeys: ['moderation'],
  openAiCompatiblePayload: ({ params }) => params.includeModeration && !isAuto(params.moderation) ? { moderation: params.moderation } : {}
});
