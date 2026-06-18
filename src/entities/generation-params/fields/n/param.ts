import { defineGenerationParam } from '../../defineParam';

export const nParam = defineGenerationParam({
  id: 'generationParam.n',
  fieldDefinitionId: 'generationParams.n',
  placementIds: ['composer.params.frame.n'],
  i18nNamespace: 'params.n',
  stateKeys: ['n', 'includeN'],
  copy: { n: { labelKey: 'params.n', descriptionKey: 'params.n.description' } },
  capability: 'n',
  includeKey: 'includeN',
  payloadKeys: ['n'],
  snapshotKeys: ['n'],
  normalize: ({ current, defaults }) => ({ n: Math.max(1, Math.min(10, Math.round(Number(current.n ?? defaults.n) || defaults.n))) }),
  openAiCompatiblePayload: ({ params }) => params.includeN ? { n: params.n } : {}
});
