import { defineGenerationParam } from '../../defineParam';

export const retryPolicyParam = defineGenerationParam({
  id: 'generationParam.retryPolicy',
  fieldDefinitionId: 'generationParams.retryPolicy',
  placementIds: ['composer.params.retry.policy'],
  i18nNamespace: 'params.retry',
  stateKeys: ['retryAttempts', 'retryDelaySeconds'],
  copy: {
    retryAttempts: { labelKey: 'params.retryAttempts', descriptionKey: 'params.retryAttempts.description' },
    retryDelaySeconds: { labelKey: 'params.retryDelaySeconds', descriptionKey: 'params.retryDelaySeconds.description' }
  },
  snapshotKeys: ['retryAttempts', 'retryDelaySeconds'],
  normalize: ({ current }) => ({
    retryAttempts: Math.max(0, Math.min(10, Math.round(Number(current.retryAttempts) || 0))),
    retryDelaySeconds: Math.max(0, Math.min(600, Number(current.retryDelaySeconds) || 0))
  })
});
