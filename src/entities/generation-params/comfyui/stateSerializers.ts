import type { ProviderParamState } from '../surfaceTypes';
import type { ComfyUiParamState, ComfyUiWorkflowBuilderItemKind } from './stateTypes';

function workflowBuilderFromState(state: ComfyUiParamState): ComfyUiWorkflowBuilderItemKind[] {
  if (state.workflowBuilder.length) return [...state.workflowBuilder];
  const next: ComfyUiWorkflowBuilderItemKind[] = [];
  if (state.pagEnabled) next.push('pag');
  if (state.loras.some((lora) => lora.enabled && lora.name.trim())) next.push('loraStack');
  if (state.freeuV2Enabled) next.push('freeuV2');
  if (state.tiledGenerationEnabled) next.push('tiledGeneration');
  if (state.tiledVaeEncodeEnabled || state.tiledVaeDecodeEnabled) next.push('tiledVae');
  if (state.perpGuiderEnabled) next.push('perpGuider');
  return next;
}

export function toComfyUiProviderParamState(state: ComfyUiParamState): ProviderParamState {
  return {
    negativePrompt: state.negativePrompt,
    width: state.width,
    height: state.height,
    batchSize: state.batchSize,
    seedMode: state.seedMode,
    seed: state.seed,
    steps: state.steps,
    cfg: state.cfg,
    samplerName: state.samplerName,
    scheduler: state.scheduler,
    denoise: state.denoise,
    filenamePrefix: state.filenamePrefix,
    hiresUpscaleMode: state.hiresUpscaleMode,
    hiresUpscaleModel: state.hiresUpscaleModel,
    hiresScale: state.hiresScale,
    hiresInputWidth: state.hiresInputWidth,
    hiresInputHeight: state.hiresInputHeight,
    workflowBuilder: workflowBuilderFromState(state),
    tiledGenerationEnabled: state.tiledGenerationEnabled,
    tiledGenerationBackend: state.tiledGenerationBackend,
    tiledGenerationTileWidth: state.tiledGenerationTileWidth,
    tiledGenerationTileHeight: state.tiledGenerationTileHeight,
    tiledGenerationStrategy: state.tiledGenerationStrategy,
    tiledDiffusionMethod: state.tiledDiffusionMethod,
    tiledDiffusionTileOverlap: state.tiledDiffusionTileOverlap,
    tiledDiffusionTileBatchSize: state.tiledDiffusionTileBatchSize,
    tiledDiffusionShiftMethod: state.tiledDiffusionShiftMethod,
    tiledDiffusionShiftSeed: state.tiledDiffusionShiftSeed,
    tiledVaeEncodeEnabled: state.tiledVaeEncodeEnabled,
    tiledVaeDecodeEnabled: state.tiledVaeDecodeEnabled,
    tiledVaeTileSize: state.tiledVaeTileSize,
    tiledVaeOverlap: state.tiledVaeOverlap,
    tiledVaeTemporalSize: state.tiledVaeTemporalSize,
    tiledVaeTemporalOverlap: state.tiledVaeTemporalOverlap,
    pagEnabled: state.pagEnabled,
    pagScale: state.pagScale,
    freeuV2Enabled: state.freeuV2Enabled,
    freeuV2B1: state.freeuV2B1,
    freeuV2B2: state.freeuV2B2,
    freeuV2S1: state.freeuV2S1,
    freeuV2S2: state.freeuV2S2,
    perpGuiderEnabled: state.perpGuiderEnabled,
    perpGuiderScale: state.perpGuiderScale,
    perpGuiderBlankConditioning: state.perpGuiderBlankConditioning,
    loras: state.loras.map((lora) => ({ ...lora }))
  };
}
