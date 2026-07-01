import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

function tiledStrategyPayload(value: string): string {
  return value === 'randomStrict' ? 'random strict' : value;
}

export const tiledGenerationPluginCore: WorkflowPluginDefinition = {
  kind: 'tiledGeneration',
  payloadKey: 'tiled_generation',
  legacyKinds: ['tiled_generation'],
  legacyPayloadKeys: ['tiledGeneration'],
  order: 10,
  isActive: (state) => state.workflowBuilder.includes('tiledGeneration'),
  enableInState: (_state, active) => ({ tiledGenerationEnabled: active }),
  labelKey: 'params.comfy.workflowPlugins.tiledGeneration',
  descriptionKey: 'params.comfy.workflowPlugins.tiledGeneration.description',
  getSummary: (state) => state.tiledGenerationBackend === 'tiledDiffusion'
    ? `ComfyUI_TiledDiffusion · ${state.tiledDiffusionMethod}`
    : `BNK_TiledKSampler · ${state.tiledGenerationStrategy}`,
  buildPayload: ({ state, active }) => active ? {
    enabled: true,
    backend: state.tiledGenerationBackend === 'tiledDiffusion' ? 'tiled_diffusion' : 'bnk_tiled_ksampler',
    tile_width: state.tiledGenerationTileWidth,
    tile_height: state.tiledGenerationTileHeight,
    ...(state.tiledGenerationBackend === 'tiledDiffusion' ? {
      method: state.tiledDiffusionMethod,
      tile_overlap: state.tiledDiffusionTileOverlap,
      tile_batch_size: state.tiledDiffusionTileBatchSize,
      shift_method: state.tiledDiffusionShiftMethod,
      shift_seed: state.tiledDiffusionShiftSeed
    } : {
      tiling_strategy: tiledStrategyPayload(state.tiledGenerationStrategy)
    })
  } : undefined,
  createSummaryEntry: ({ state, active, payload }) => {
    if (!active) return null;
    const mode = state.tiledGenerationBackend === 'tiledDiffusion' ? 'ComfyUI_TiledDiffusion' : 'BNK_TiledKSampler';
    const detail = state.tiledGenerationBackend === 'tiledDiffusion'
      ? `${state.tiledDiffusionMethod} · overlap ${state.tiledDiffusionTileOverlap} · batch ${state.tiledDiffusionTileBatchSize}`
      : tiledStrategyPayload(state.tiledGenerationStrategy);
    return { id: 'tiledGeneration', label: 'Tiled generation', value: `${mode} · ${state.tiledGenerationTileWidth}×${state.tiledGenerationTileHeight} · ${detail}`, rawValue: payload.tiled_generation };
  },
  renderSettings: () => []
};
