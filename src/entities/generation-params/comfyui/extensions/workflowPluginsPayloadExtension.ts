import type { ProviderRequestParameterSummaryEntry } from '../../../../domain/generationTask';
import type { ProviderGenerationExtension } from '../../extensionTypes';
import { readComfyUiParamState, type ComfyUiParamState, type ComfyUiTilingStrategy, type ComfyUiWorkflowBuilderItemKind } from '../state';

const workflowBuilderPayloadKind: Record<ComfyUiWorkflowBuilderItemKind, string> = {
  tiledGeneration: 'tiled_generation',
  tiledVae: 'tiled_vae',
  pag: 'pag',
  freeuV2: 'freeu_v2',
  perpGuider: 'perp_neg_guider',
  loraStack: 'lora_stack'
};

function tiledStrategyPayload(value: ComfyUiTilingStrategy): string {
  return value === 'randomStrict' ? 'random strict' : value;
}

function tiledGenerationModeLabel(state: ComfyUiParamState): string {
  return state.tiledGenerationBackend === 'tiledDiffusion' ? 'ComfyUI_TiledDiffusion' : 'BNK_TiledKSampler';
}

function isWorkflowPluginActive(state: ComfyUiParamState, kind: ComfyUiWorkflowBuilderItemKind): boolean {
  return state.workflowBuilder.includes(kind);
}

export function buildComfyUiWorkflowPluginsPayload(state: ComfyUiParamState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    workflow_order: state.workflowBuilder.map((kind) => workflowBuilderPayloadKind[kind])
  };
  if (isWorkflowPluginActive(state, 'tiledGeneration')) {
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
  if (isWorkflowPluginActive(state, 'tiledVae')) {
    payload.tiled_vae = {
      encode: state.tiledVaeEncodeEnabled,
      decode: state.tiledVaeDecodeEnabled,
      tile_size: state.tiledVaeTileSize,
      overlap: state.tiledVaeOverlap,
      temporal_size: state.tiledVaeTemporalSize,
      temporal_overlap: state.tiledVaeTemporalOverlap
    };
  }
  if (isWorkflowPluginActive(state, 'pag')) payload.pag = { enabled: true, scale: state.pagScale };
  if (isWorkflowPluginActive(state, 'freeuV2')) {
    payload.freeu_v2 = {
      enabled: true,
      b1: state.freeuV2B1,
      b2: state.freeuV2B2,
      s1: state.freeuV2S1,
      s2: state.freeuV2S2
    };
  }
  if (isWorkflowPluginActive(state, 'perpGuider')) {
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
  const entriesByKind: Partial<Record<ComfyUiWorkflowBuilderItemKind, ProviderRequestParameterSummaryEntry>> = {};
  if (isWorkflowPluginActive(state, 'tiledGeneration')) {
    const mode = tiledGenerationModeLabel(state);
    const detail = state.tiledGenerationBackend === 'tiledDiffusion'
      ? `${state.tiledDiffusionMethod} · overlap ${state.tiledDiffusionTileOverlap} · batch ${state.tiledDiffusionTileBatchSize}`
      : tiledStrategyPayload(state.tiledGenerationStrategy);
    entriesByKind.tiledGeneration = { id: 'tiledGeneration', label: 'Tiled generation', value: `${mode} · ${state.tiledGenerationTileWidth}×${state.tiledGenerationTileHeight} · ${detail}`, rawValue: payload.tiled_generation };
  }
  if (isWorkflowPluginActive(state, 'tiledVae')) entriesByKind.tiledVae = { id: 'tiledVae', label: 'Tiled VAE', value: `tile ${state.tiledVaeTileSize} / overlap ${state.tiledVaeOverlap}`, rawValue: payload.tiled_vae };
  if (isWorkflowPluginActive(state, 'pag')) entriesByKind.pag = { id: 'pag', label: 'PAG', value: `scale ${state.pagScale}`, rawValue: payload.pag };
  if (isWorkflowPluginActive(state, 'freeuV2')) entriesByKind.freeuV2 = { id: 'freeuV2', label: 'FreeU V2', value: `b ${state.freeuV2B1}/${state.freeuV2B2} · s ${state.freeuV2S1}/${state.freeuV2S2}`, rawValue: payload.freeu_v2 };
  if (isWorkflowPluginActive(state, 'perpGuider')) entriesByKind.perpGuider = { id: 'perpNegGuider', label: 'PerpNegGuider', value: `neg scale ${state.perpGuiderScale}`, rawValue: payload.perp_neg_guider };
  return state.workflowBuilder.flatMap((kind) => entriesByKind[kind] ? [entriesByKind[kind]] : []);
}

export const comfyUiWorkflowPluginsPayloadExtension: ProviderGenerationExtension = {
  id: 'comfyui.extension.workflow-plugins.payload',
  order: 20,
  buildPayload: ({ params, provider }) => buildComfyUiWorkflowPluginsPayload(readComfyUiParamState(params, provider)),
  captureParameterSummaryEntries: ({ params, provider }) => createComfyUiWorkflowPluginsSummaryEntries(readComfyUiParamState(params, provider))
};
