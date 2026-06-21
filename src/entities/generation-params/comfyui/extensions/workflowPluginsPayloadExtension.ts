import type { ProviderRequestParameterSummaryEntry } from '../../../../domain/generationTask';
import type { ProviderGenerationExtension } from '../../extensionTypes';
import { readComfyUiParamState, type ComfyUiParamState, type ComfyUiTilingStrategy } from '../state';

function tiledStrategyPayload(value: ComfyUiTilingStrategy): string {
  return value === 'randomStrict' ? 'random strict' : value;
}

function tiledGenerationModeLabel(state: ComfyUiParamState): string {
  return state.tiledGenerationBackend === 'tiledDiffusion' ? 'ComfyUI_TiledDiffusion' : 'BNK_TiledKSampler';
}

export function buildComfyUiWorkflowPluginsPayload(state: ComfyUiParamState): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (state.tiledGenerationEnabled) {
    payload.tiled_generation = {
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
    };
  }
  if (state.tiledVaeEncodeEnabled || state.tiledVaeDecodeEnabled) {
    payload.tiled_vae = {
      encode: state.tiledVaeEncodeEnabled,
      decode: state.tiledVaeDecodeEnabled,
      tile_size: state.tiledVaeTileSize,
      overlap: state.tiledVaeOverlap,
      temporal_size: state.tiledVaeTemporalSize,
      temporal_overlap: state.tiledVaeTemporalOverlap
    };
  }
  if (state.pagEnabled) payload.pag = { enabled: true, scale: state.pagScale };
  if (state.perpGuiderEnabled) {
    payload.perp_neg_guider = {
      enabled: true,
      neg_scale: state.perpGuiderScale,
      blank_conditioning: state.perpGuiderBlankConditioning
    };
  }
  return payload;
}

export function createComfyUiWorkflowPluginsSummaryEntries(state: ComfyUiParamState): ProviderRequestParameterSummaryEntry[] {
  const payload = buildComfyUiWorkflowPluginsPayload(state);
  const entries: ProviderRequestParameterSummaryEntry[] = [];
  if (state.tiledGenerationEnabled) {
    const mode = tiledGenerationModeLabel(state);
    const detail = state.tiledGenerationBackend === 'tiledDiffusion'
      ? `${state.tiledDiffusionMethod} · overlap ${state.tiledDiffusionTileOverlap} · batch ${state.tiledDiffusionTileBatchSize}`
      : tiledStrategyPayload(state.tiledGenerationStrategy);
    entries.push({ id: 'tiledGeneration', label: 'Tiled generation', value: `${mode} · ${state.tiledGenerationTileWidth}×${state.tiledGenerationTileHeight} · ${detail}`, rawValue: payload.tiled_generation });
  }
  if (state.tiledVaeEncodeEnabled || state.tiledVaeDecodeEnabled) entries.push({ id: 'tiledVae', label: 'Tiled VAE', value: `tile ${state.tiledVaeTileSize} / overlap ${state.tiledVaeOverlap}`, rawValue: payload.tiled_vae });
  if (state.pagEnabled) entries.push({ id: 'pag', label: 'PAG', value: `scale ${state.pagScale}`, rawValue: payload.pag });
  if (state.perpGuiderEnabled) entries.push({ id: 'perpNegGuider', label: 'PerpNegGuider', value: `neg scale ${state.perpGuiderScale}`, rawValue: payload.perp_neg_guider });
  return entries;
}

export const comfyUiWorkflowPluginsPayloadExtension: ProviderGenerationExtension = {
  id: 'comfyui.extension.workflow-plugins.payload',
  order: 20,
  buildPayload: ({ params, provider }) => buildComfyUiWorkflowPluginsPayload(readComfyUiParamState(params, provider)),
  captureParameterSummaryEntries: ({ params, provider }) => createComfyUiWorkflowPluginsSummaryEntries(readComfyUiParamState(params, provider))
};
