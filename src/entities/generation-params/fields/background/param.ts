import { defineGenerationParam } from '../../defineParam';
import { isAuto } from '../../serializers/openAiCompatible';

export const backgroundParam = defineGenerationParam({
  id: 'generationParam.background',
  fieldDefinitionId: 'generationParams.background',
  placementIds: ['composer.params.render.background'],
  i18nNamespace: 'params.background',
  stateKeys: ['background', 'includeBackground'],
  copy: { background: { labelKey: 'params.background', descriptionKey: 'params.background.description' } },
  options: {
    background: [
      { value: '', labelKey: 'params.option.omit' },
      { value: 'auto', label: 'auto' },
      { value: 'opaque', label: 'opaque' },
      { value: 'transparent', label: 'transparent' }
    ]
  },
  capability: 'background',
  includeKey: 'includeBackground',
  payloadKeys: ['background'],
  snapshotKeys: ['background'],
  openAiCompatiblePayload: ({ params }) => params.includeBackground && !isAuto(params.background) ? { background: params.background } : {}
});
