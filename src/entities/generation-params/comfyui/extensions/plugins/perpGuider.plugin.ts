import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

export const perpGuiderPluginCore: WorkflowPluginDefinition = {
  kind: 'perpGuider',
  payloadKey: 'perp_neg_guider',
  legacyKinds: ['perp_neg_guider'],
  legacyPayloadKeys: ['perpGuider'],
  order: 50,
  isActive: (state) => state.workflowBuilder.includes('perpGuider'),
  enableInState: (_state, active) => ({ perpGuiderEnabled: active }),
  labelKey: 'params.comfy.workflowPlugins.perpGuider',
  descriptionKey: 'params.comfy.workflowPlugins.perpGuider.description',
  getSummary: (state) => `neg scale ${state.perpGuiderScale}`,
  buildPayload: ({ state, active }) => active ? {
    enabled: true,
    neg_scale: state.perpGuiderScale,
    blank_conditioning: state.perpGuiderBlankConditioning
  } : undefined,
  createSummaryEntry: ({ state, active, payload }) => active ? { id: 'perpNegGuider', label: 'PerpNegGuider', value: `neg scale ${state.perpGuiderScale}`, rawValue: payload.perp_neg_guider } : null,
  renderSettings: () => []
};
