import { defineGenerationParam } from '../../defineParam';

export const streamParam = defineGenerationParam({
  id: 'generationParam.stream',
  fieldDefinitionId: 'generationParams.stream',
  placementIds: ['composer.params.output.stream'],
  i18nNamespace: 'params.stream',
  stateKeys: ['stream', 'includeStream'],
  copy: { stream: { labelKey: 'params.stream', descriptionKey: 'params.stream.description' } },
  options: {
    boolean: [
      { value: 'false', labelKey: 'params.option.false' },
      { value: 'true', labelKey: 'params.option.true' }
    ]
  },
  capability: 'stream',
  includeKey: 'includeStream',
  payloadKeys: ['stream'],
  snapshotKeys: ['stream'],
  openAiCompatiblePayload: ({ params }) => params.includeStream ? { stream: params.stream } : {}
});
