import { defineGenerationParam } from '../../defineParam';
import { isAuto } from '../../serializers/openAiCompatible';

export const qualityParam = defineGenerationParam({
  id: 'generationParam.quality',
  fieldDefinitionId: 'generationParams.quality',
  placementIds: ['composer.params.render.quality'],
  i18nNamespace: 'params.quality',
  stateKeys: ['quality', 'includeQuality'],
  copy: { quality: { labelKey: 'params.quality', descriptionKey: 'params.quality.description' } },
  options: {
    quality: [
      { value: '', labelKey: 'params.option.omit' },
      { value: 'auto', label: 'auto' },
      { value: 'low', label: 'low' },
      { value: 'medium', label: 'medium' },
      { value: 'high', label: 'high' },
      { value: 'standard', label: 'standard' },
      { value: 'hd', label: 'hd' }
    ]
  },
  capability: 'quality',
  includeKey: 'includeQuality',
  payloadKeys: ['quality'],
  snapshotKeys: ['quality'],
  openAiCompatiblePayload: ({ params }) => params.includeQuality && !isAuto(params.quality) ? { quality: params.quality } : {}
});
