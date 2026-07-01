import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

export const tiledVaePluginCore: WorkflowPluginDefinition = {
  kind: 'tiledVae',
  payloadKey: 'tiled_vae',
  legacyKinds: ['tiled_vae'],
  legacyPayloadKeys: ['tiledVae'],
  order: 20,
  isActive: (state) => state.workflowBuilder.includes('tiledVae'),
  enableInState: (state, active) => ({
    tiledVaeEncodeEnabled: active && (state.tiledVaeEncodeEnabled || (!state.tiledVaeEncodeEnabled && !state.tiledVaeDecodeEnabled)),
    tiledVaeDecodeEnabled: active && (state.tiledVaeDecodeEnabled || (!state.tiledVaeEncodeEnabled && !state.tiledVaeDecodeEnabled))
  }),
  labelKey: 'params.comfy.workflowPlugins.tiledVae',
  descriptionKey: 'params.comfy.workflowPlugins.tiledVae.description',
  getSummary: (state) => `${state.tiledVaeEncodeEnabled ? 'encode' : ''}${state.tiledVaeEncodeEnabled && state.tiledVaeDecodeEnabled ? ' + ' : ''}${state.tiledVaeDecodeEnabled ? 'decode' : ''} · tile ${state.tiledVaeTileSize}` || `tile ${state.tiledVaeTileSize}`,
  buildPayload: ({ state, active }) => active ? {
    encode: state.tiledVaeEncodeEnabled,
    decode: state.tiledVaeDecodeEnabled,
    tile_size: state.tiledVaeTileSize,
    overlap: state.tiledVaeOverlap,
    temporal_size: state.tiledVaeTemporalSize,
    temporal_overlap: state.tiledVaeTemporalOverlap
  } : undefined,
  createSummaryEntry: ({ state, active, payload }) => active ? { id: 'tiledVae', label: 'Tiled VAE', value: `tile ${state.tiledVaeTileSize} / overlap ${state.tiledVaeOverlap}`, rawValue: payload.tiled_vae } : null,
  renderSettings: () => []
};
