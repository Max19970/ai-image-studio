import type { ComfyUiParamState } from './stateTypes';

export const COMFYUI_MAX_SEED = Number.MAX_SAFE_INTEGER;

export const comfyUiSamplerOptions = ['euler', 'euler_ancestral', 'heun', 'dpm_2', 'dpmpp_2m', 'dpmpp_sde', 'dpmpp_3m_sde'] as const;
export const comfyUiSchedulerOptions = ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform'] as const;
export const comfyUiTiledGenerationBackendOptions = ['bnkTiledKSampler', 'tiledDiffusion'] as const;
export const comfyUiTilingStrategyOptions = ['random', 'randomStrict', 'padded', 'simple'] as const;
export const comfyUiTiledDiffusionMethodOptions = ['MultiDiffusion', 'Mixture of Diffusers', 'SpotDiffusion'] as const;
export const comfyUiSpotDiffusionShiftMethodOptions = ['random', 'sorted', 'fibonacci'] as const;
export const comfyUiWorkflowBuilderItemOptions = ['tiledGeneration', 'tiledVae', 'pag', 'freeuV2', 'perpGuider', 'loraStack'] as const;

export const defaultComfyUiParamState: ComfyUiParamState = {
  negativePrompt: '',
  width: 1024,
  height: 1024,
  batchSize: 1,
  seedMode: 'random',
  seed: 1,
  steps: 28,
  cfg: 7,
  samplerName: 'euler',
  scheduler: 'normal',
  denoise: 1,
  filenamePrefix: 'image-studio',
  hiresUpscaleMode: 'latent',
  hiresUpscaleModel: '',
  hiresScale: 2,
  hiresInputWidth: 0,
  hiresInputHeight: 0,
  workflowBuilder: [],
  tiledGenerationEnabled: false,
  tiledGenerationBackend: 'bnkTiledKSampler',
  tiledGenerationTileWidth: 512,
  tiledGenerationTileHeight: 512,
  tiledGenerationStrategy: 'random',
  tiledDiffusionMethod: 'Mixture of Diffusers',
  tiledDiffusionTileOverlap: 64,
  tiledDiffusionTileBatchSize: 4,
  tiledDiffusionShiftMethod: 'random',
  tiledDiffusionShiftSeed: 0,
  tiledVaeEncodeEnabled: false,
  tiledVaeDecodeEnabled: false,
  tiledVaeTileSize: 512,
  tiledVaeOverlap: 64,
  tiledVaeTemporalSize: 64,
  tiledVaeTemporalOverlap: 8,
  pagEnabled: false,
  pagScale: 3,
  freeuV2Enabled: false,
  freeuV2B1: 1.3,
  freeuV2B2: 1.4,
  freeuV2S1: 0.9,
  freeuV2S2: 0.2,
  perpGuiderEnabled: false,
  perpGuiderScale: 1,
  perpGuiderBlankConditioning: '',
  loras: []
};
