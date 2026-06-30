export interface ComfyUiLoraInput {
  lora_name?: string;
  name?: string;
  strength_model?: number;
  strength_clip?: number;
  enabled?: boolean;
}

export type ComfyUiHiresUpscaleMode = 'latent' | 'ai';
export type ComfyUiTiledGenerationBackend = 'bnk_tiled_ksampler' | 'tiled_diffusion';
export type ComfyUiTilingStrategy = 'random' | 'random strict' | 'padded' | 'simple';
export type ComfyUiTiledDiffusionMethod = 'MultiDiffusion' | 'Mixture of Diffusers' | 'SpotDiffusion';
export type ComfyUiSpotDiffusionShiftMethod = 'random' | 'sorted' | 'fibonacci';
export type ComfyUiWorkflowPluginKind = 'tiled_generation' | 'tiled_vae' | 'pag' | 'freeu_v2' | 'perp_neg_guider' | 'lora_stack';

export interface ComfyUiTiledGenerationInput {
  enabled?: boolean;
  backend?: ComfyUiTiledGenerationBackend;
  tile_width?: number;
  tile_height?: number;
  tiling_strategy?: ComfyUiTilingStrategy;
  method?: ComfyUiTiledDiffusionMethod;
  tile_overlap?: number;
  tile_batch_size?: number;
  shift_method?: ComfyUiSpotDiffusionShiftMethod;
  shift_seed?: number;
}

export interface ComfyUiTiledVaeInput {
  encode?: boolean;
  decode?: boolean;
  tile_size?: number;
  overlap?: number;
  temporal_size?: number;
  temporal_overlap?: number;
}

export interface ComfyUiPagInput {
  enabled?: boolean;
  scale?: number;
}

export interface ComfyUiPerpGuiderInput {
  enabled?: boolean;
  neg_scale?: number;
  blank_conditioning?: string;
}

export interface ComfyUiFreeuV2Input {
  enabled?: boolean;
  b1?: number;
  b2?: number;
  s1?: number;
  s2?: number;
}

export interface ComfyUiGenerationPayload {
  prompt: string;
  negative_prompt?: string;
  negativePrompt?: string;
  checkpoint?: string;
  ckpt_name?: string;
  model?: string;
  width?: number;
  height?: number;
  size?: string;
  batch_size?: number;
  n?: number;
  seed?: number;
  steps?: number;
  cfg?: number;
  sampler_name?: string;
  scheduler?: string;
  denoise?: number;
  loras?: ComfyUiLoraInput[];
  filename_prefix?: string;
  provider_mode?: string;
  hires_upscale_mode?: ComfyUiHiresUpscaleMode;
  hiresUpscaleMode?: ComfyUiHiresUpscaleMode;
  hires_upscale_model?: string;
  hiresUpscaleModel?: string;
  tiled_generation?: ComfyUiTiledGenerationInput;
  tiled_vae?: ComfyUiTiledVaeInput;
  pag?: ComfyUiPagInput;
  freeu_v2?: ComfyUiFreeuV2Input;
  perp_neg_guider?: ComfyUiPerpGuiderInput;
  workflow_order?: ComfyUiWorkflowPluginKind[];
}

export type ComfyUiWorkflowNode = {
  class_type: string;
  inputs: Record<string, unknown>;
};

export type ComfyUiWorkflow = Record<string, ComfyUiWorkflowNode>;

export interface ComfyUiResolvedWorkflowPlugins {
  order: ComfyUiWorkflowPluginKind[];
  tiledGeneration: {
    enabled: boolean;
    backend: ComfyUiTiledGenerationBackend;
    tileWidth: number;
    tileHeight: number;
    tilingStrategy: ComfyUiTilingStrategy;
    method: ComfyUiTiledDiffusionMethod;
    tileOverlap: number;
    tileBatchSize: number;
    shiftMethod: ComfyUiSpotDiffusionShiftMethod;
    shiftSeed: number;
  };
  tiledVae: {
    encode: boolean;
    decode: boolean;
    tileSize: number;
    overlap: number;
    temporalSize: number;
    temporalOverlap: number;
  };
  pag: {
    enabled: boolean;
    scale: number;
  };
  freeuV2: {
    enabled: boolean;
    b1: number;
    b2: number;
    s1: number;
    s2: number;
  };
  perpGuider: {
    enabled: boolean;
    negScale: number;
    blankConditioning: string;
  };
}

export interface ComfyUiResolvedGenerationConfig {
  prompt: string;
  negativePrompt: string;
  checkpoint: string;
  width: number;
  height: number;
  batchSize: number;
  seed: number;
  steps: number;
  cfg: number;
  samplerName: string;
  scheduler: string;
  denoise: number;
  filenamePrefix: string;
  loras: Required<Pick<ComfyUiLoraInput, 'lora_name' | 'strength_model' | 'strength_clip'>>[];
  workflowPlugins: ComfyUiResolvedWorkflowPlugins;
  providerMode?: string;
  hiresUpscaleMode?: ComfyUiHiresUpscaleMode;
  hiresUpscaleModel?: string;
  inputImageName?: string;
}
