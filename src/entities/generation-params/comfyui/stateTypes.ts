export type ComfyUiTiledGenerationBackend = 'bnkTiledKSampler' | 'tiledDiffusion';
export type ComfyUiTilingStrategy = 'random' | 'randomStrict' | 'padded' | 'simple';
export type ComfyUiTiledDiffusionMethod = 'MultiDiffusion' | 'Mixture of Diffusers' | 'SpotDiffusion';
export type ComfyUiSpotDiffusionShiftMethod = 'random' | 'sorted' | 'fibonacci';
export type ComfyUiWorkflowBuilderItemKind = string & {};

export interface ComfyUiLoraSelection {
  name: string;
  strengthModel: number;
  strengthClip: number;
  enabled: boolean;
}

export interface ComfyUiParamState {
  negativePrompt: string;
  width: number;
  height: number;
  batchSize: number;
  seedMode: 'random' | 'fixed';
  seed: number;
  steps: number;
  cfg: number;
  samplerName: string;
  scheduler: string;
  denoise: number;
  filenamePrefix: string;
  hiresUpscaleMode: 'latent' | 'ai';
  hiresUpscaleModel: string;
  hiresScale: number;
  hiresInputWidth: number;
  hiresInputHeight: number;
  workflowBuilder: ComfyUiWorkflowBuilderItemKind[];
  tiledGenerationEnabled: boolean;
  tiledGenerationBackend: ComfyUiTiledGenerationBackend;
  tiledGenerationTileWidth: number;
  tiledGenerationTileHeight: number;
  tiledGenerationStrategy: ComfyUiTilingStrategy;
  tiledDiffusionMethod: ComfyUiTiledDiffusionMethod;
  tiledDiffusionTileOverlap: number;
  tiledDiffusionTileBatchSize: number;
  tiledDiffusionShiftMethod: ComfyUiSpotDiffusionShiftMethod;
  tiledDiffusionShiftSeed: number;
  tiledVaeEncodeEnabled: boolean;
  tiledVaeDecodeEnabled: boolean;
  tiledVaeTileSize: number;
  tiledVaeOverlap: number;
  tiledVaeTemporalSize: number;
  tiledVaeTemporalOverlap: number;
  pagEnabled: boolean;
  pagScale: number;
  freeuV2Enabled: boolean;
  freeuV2B1: number;
  freeuV2B2: number;
  freeuV2S1: number;
  freeuV2S2: number;
  perpGuiderEnabled: boolean;
  perpGuiderScale: number;
  perpGuiderBlankConditioning: string;
  loras: ComfyUiLoraSelection[];
}
