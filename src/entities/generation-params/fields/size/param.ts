import { defineGenerationParam } from '../../defineParam';
import { getOpenAiCompatibleSize } from '../../serializers/openAiCompatible';

export const sizeParam = defineGenerationParam({
  id: 'generationParam.size',
  fieldDefinitionId: 'generationParams.size',
  placementIds: ['composer.params.frame.size'],
  i18nNamespace: 'params.size',
  stateKeys: ['sizeMode', 'sizePreset', 'width', 'height'],
  copy: {
    sizeMode: { labelKey: 'params.sizeMode', descriptionKey: 'params.sizeMode.description' },
    preset: { labelKey: 'params.preset', descriptionKey: 'params.preset.description' },
    width: { labelKey: 'params.width', descriptionKey: 'params.width.description' },
    height: { labelKey: 'params.height', descriptionKey: 'params.height.description' }
  },
  options: {
    sizeMode: [
      { value: 'auto', labelKey: 'params.option.auto' },
      { value: 'preset', labelKey: 'params.option.preset' },
      { value: 'custom', labelKey: 'params.option.custom' }
    ]
  },
  capability: 'size',
  payloadKeys: ['size'],
  snapshotKeys: ['sizeMode', 'sizePreset', 'width', 'height'],
  normalize: ({ value, current, defaults }) => ({
    sizeMode: value?.sizeMode === 'auto' || value?.sizeMode === 'custom' || value?.sizeMode === 'preset' ? value.sizeMode : defaults.sizeMode,
    sizePreset: typeof current.sizePreset === 'string' && current.sizePreset ? current.sizePreset : defaults.sizePreset,
    width: Number.isFinite(Number(current.width)) ? Number(current.width) : defaults.width,
    height: Number.isFinite(Number(current.height)) ? Number(current.height) : defaults.height
  }),
  openAiCompatiblePayload: ({ params }) => {
    const size = getOpenAiCompatibleSize(params);
    return size ? { size } : {};
  }
});
