import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

export const pagPluginCore: WorkflowPluginDefinition = {
  kind: 'pag',
  payloadKey: 'pag',
  order: 30,
  isActive: (state) => state.workflowBuilder.includes('pag'),
  enableInState: (_state, active) => ({ pagEnabled: active }),
  labelKey: 'params.comfy.workflowPlugins.pag',
  descriptionKey: 'params.comfy.workflowPlugins.pag.description',
  getSummary: (state) => `scale ${state.pagScale}`,
  buildPayload: ({ state, active }) => active ? { enabled: true, scale: state.pagScale } : undefined,
  createSummaryEntry: ({ state, active, payload }) => active ? { id: 'pag', label: 'PAG', value: `scale ${state.pagScale}`, rawValue: payload.pag } : null,
  renderSettings: () => []
};
