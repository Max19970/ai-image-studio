import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

export const freeuV2PluginCore: WorkflowPluginDefinition = {
  kind: 'freeuV2',
  payloadKey: 'freeu_v2',
  legacyKinds: ['freeu_v2'],
  legacyPayloadKeys: ['freeuV2'],
  order: 40,
  isActive: (state) => state.workflowBuilder.includes('freeuV2'),
  enableInState: (_state, active) => ({ freeuV2Enabled: active }),
  labelKey: 'params.comfy.workflowPlugins.freeuV2',
  descriptionKey: 'params.comfy.workflowPlugins.freeuV2.description',
  getSummary: (state) => `b ${state.freeuV2B1}/${state.freeuV2B2} · s ${state.freeuV2S1}/${state.freeuV2S2}`,
  buildPayload: ({ state, active }) => active ? {
    enabled: true,
    b1: state.freeuV2B1,
    b2: state.freeuV2B2,
    s1: state.freeuV2S1,
    s2: state.freeuV2S2
  } : undefined,
  createSummaryEntry: ({ state, active, payload }) => active ? { id: 'freeuV2', label: 'FreeU V2', value: `b ${state.freeuV2B1}/${state.freeuV2B2} · s ${state.freeuV2S1}/${state.freeuV2S2}`, rawValue: payload.freeu_v2 } : null,
  renderSettings: () => []
};
