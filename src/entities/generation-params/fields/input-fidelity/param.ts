import { defineGenerationParam } from '../../defineParam';
import { isBlank } from '../../serializers/openAiCompatible';

export const inputFidelityParam = defineGenerationParam({
  id: 'generationParam.inputFidelity',
  fieldDefinitionId: 'generationParams.inputFidelity',
  placementIds: ['composer.params.render.inputFidelity'],
  i18nNamespace: 'params.inputFidelity',
  stateKeys: ['inputFidelity', 'includeInputFidelity'],
  copy: { inputFidelity: { labelKey: 'params.inputFidelity', descriptionKey: 'params.inputFidelity.description' } },
  options: {
    inputFidelity: [
      { value: '', labelKey: 'params.option.omit' },
      { value: 'low', label: 'low' },
      { value: 'high', label: 'high' }
    ]
  },
  capability: 'input_fidelity',
  includeKey: 'includeInputFidelity',
  payloadKeys: ['input_fidelity'],
  snapshotKeys: ['inputFidelity'],
  openAiCompatiblePayload: ({ params, mode }) => mode === 'edit' && params.includeInputFidelity && !isBlank(params.inputFidelity) ? { input_fidelity: params.inputFidelity } : {}
});
