import { HttpError, type ProviderSettings } from '../types';
import { applyComfyUiModelConditioningExtensions } from './workflowExtensions';
import { createComfyUiNodeAllocator, type ComfyUiNodeRef, type ComfyUiWorkflowNodeAllocator } from './workflowExtensionTypes';

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
  perp_neg_guider?: ComfyUiPerpGuiderInput;
}

export type ComfyUiWorkflowNode = {
  class_type: string;
  inputs: Record<string, unknown>;
};

export type ComfyUiWorkflow = Record<string, ComfyUiWorkflowNode>;

export interface ComfyUiResolvedWorkflowPlugins {
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

const MAX_SEED = 2 ** 31 - 1;
const MIN_SIZE = 64;
const MAX_SIZE = 4096;

function asFiniteNumber(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(asFiniteNumber(value, fallback))));
}

function clampFloat(value: unknown, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, asFiniteNumber(value, fallback)));
}

function parseSize(size: unknown): { width?: number; height?: number } {
  if (typeof size !== 'string') return {};
  const match = size.match(/^(\d+)x(\d+)$/i);
  if (!match) return {};
  return { width: Number(match[1]), height: Number(match[2]) };
}

function randomSeed(): number {
  return Math.floor(Math.random() * MAX_SEED);
}

function normalizeLoras(value: unknown): ComfyUiResolvedGenerationConfig['loras'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ComfyUiResolvedGenerationConfig['loras'] => {
    if (!item || typeof item !== 'object') return [];
    const source = item as ComfyUiLoraInput;
    if (source.enabled === false) return [];
    const loraName = String(source.lora_name ?? source.name ?? '').trim();
    if (!loraName) return [];
    return [{
      lora_name: loraName,
      strength_model: clampFloat(source.strength_model, 1, -10, 10),
      strength_clip: clampFloat(source.strength_clip, source.strength_model ?? 1, -10, 10)
    }];
  });
}

function normalizeHiresUpscaleMode(value: unknown): ComfyUiHiresUpscaleMode {
  return value === 'ai' ? 'ai' : 'latent';
}

function normalizeTiledGenerationBackend(value: unknown): ComfyUiTiledGenerationBackend {
  return value === 'tiled_diffusion' ? 'tiled_diffusion' : 'bnk_tiled_ksampler';
}

function normalizeTilingStrategy(value: unknown): ComfyUiTilingStrategy {
  return value === 'random strict' || value === 'padded' || value === 'simple' ? value : 'random';
}

function normalizeTiledDiffusionMethod(value: unknown): ComfyUiTiledDiffusionMethod {
  return value === 'MultiDiffusion' || value === 'SpotDiffusion' ? value : 'Mixture of Diffusers';
}

function normalizeSpotDiffusionShiftMethod(value: unknown): ComfyUiSpotDiffusionShiftMethod {
  return value === 'sorted' || value === 'fibonacci' ? value : 'random';
}

function normalizeWorkflowPlugins(typed: ComfyUiGenerationPayload): ComfyUiResolvedWorkflowPlugins {
  const tiledGeneration = typed.tiled_generation ?? {};
  const tiledVae = typed.tiled_vae ?? {};
  const pag = typed.pag ?? {};
  const perpGuider = typed.perp_neg_guider ?? {};
  return {
    tiledGeneration: {
      enabled: tiledGeneration.enabled === true,
      backend: normalizeTiledGenerationBackend(tiledGeneration.backend),
      tileWidth: clampInt(tiledGeneration.tile_width, 512, 256, 8192),
      tileHeight: clampInt(tiledGeneration.tile_height, 512, 256, 8192),
      tilingStrategy: normalizeTilingStrategy(tiledGeneration.tiling_strategy),
      method: normalizeTiledDiffusionMethod(tiledGeneration.method),
      tileOverlap: clampInt(tiledGeneration.tile_overlap, 64, 0, 2048),
      tileBatchSize: clampInt(tiledGeneration.tile_batch_size, 4, 1, 8192),
      shiftMethod: normalizeSpotDiffusionShiftMethod(tiledGeneration.shift_method),
      shiftSeed: clampInt(tiledGeneration.shift_seed, 0, 0, MAX_SEED)
    },
    tiledVae: {
      encode: tiledVae.encode === true,
      decode: tiledVae.decode === true,
      tileSize: clampInt(tiledVae.tile_size, 512, 64, 4096),
      overlap: clampInt(tiledVae.overlap, 64, 0, 4096),
      temporalSize: clampInt(tiledVae.temporal_size, 64, 8, 4096),
      temporalOverlap: clampInt(tiledVae.temporal_overlap, 8, 4, 4096)
    },
    pag: {
      enabled: pag.enabled === true,
      scale: clampFloat(pag.scale, 3, 0, 100)
    },
    perpGuider: {
      enabled: perpGuider.enabled === true,
      negScale: clampFloat(perpGuider.neg_scale, 1, 0, 100),
      blankConditioning: String(perpGuider.blank_conditioning ?? '').trim()
    }
  };
}

function assertWorkflowPluginCompatibility(plugins: ComfyUiResolvedWorkflowPlugins) {
  if (plugins.tiledGeneration.enabled && plugins.tiledGeneration.backend === 'bnk_tiled_ksampler' && plugins.perpGuider.enabled) {
    throw new HttpError('ComfyUI BNK_TiledKSampler cannot be combined with PerpNegGuider in the generated workflow. Use ComfyUI_TiledDiffusion mode or disable one option.', 400);
  }
}

export function resolveComfyUiGenerationConfig(provider: ProviderSettings, payload: Record<string, unknown>): ComfyUiResolvedGenerationConfig {
  const typed = payload as unknown as ComfyUiGenerationPayload;
  const prompt = String(typed.prompt ?? '').trim();
  if (!prompt) throw new HttpError('Prompt is required before sending the ComfyUI request.', 400);

  const size = parseSize(typed.size);
  const width = clampInt(typed.width ?? size.width, 1024, MIN_SIZE, MAX_SIZE);
  const height = clampInt(typed.height ?? size.height, 1024, MIN_SIZE, MAX_SIZE);
  const checkpoint = String(typed.checkpoint ?? typed.ckpt_name ?? typed.model ?? provider.modelId ?? '').trim();
  if (!checkpoint) throw new HttpError('ComfyUI checkpoint is required. Select a checkpoint before generation.', 400);
  const workflowPlugins = normalizeWorkflowPlugins(typed);
  assertWorkflowPluginCompatibility(workflowPlugins);

  return {
    prompt,
    negativePrompt: String(typed.negative_prompt ?? typed.negativePrompt ?? '').trim(),
    checkpoint,
    width,
    height,
    batchSize: clampInt(typed.batch_size ?? typed.n, 1, 1, 16),
    seed: clampInt(typed.seed ?? randomSeed(), randomSeed(), 0, MAX_SEED),
    steps: clampInt(typed.steps, 28, 1, 150),
    cfg: clampFloat(typed.cfg, 7, 0, 30),
    samplerName: String(typed.sampler_name ?? 'euler').trim() || 'euler',
    scheduler: String(typed.scheduler ?? 'normal').trim() || 'normal',
    denoise: clampFloat(typed.denoise, 1, 0, 1),
    filenamePrefix: String(typed.filename_prefix ?? 'image-studio').trim() || 'image-studio',
    loras: normalizeLoras(typed.loras),
    workflowPlugins,
    providerMode: typeof typed.provider_mode === 'string' ? typed.provider_mode : undefined
  };
}

export function resolveComfyUiHiresFixConfig(
  provider: ProviderSettings,
  payload: Record<string, unknown>,
  inputImageName: string
): ComfyUiResolvedGenerationConfig {
  const base = resolveComfyUiGenerationConfig(provider, payload);
  const typed = payload as unknown as ComfyUiGenerationPayload;
  const hiresUpscaleMode = normalizeHiresUpscaleMode(typed.hires_upscale_mode ?? typed.hiresUpscaleMode);
  const hiresUpscaleModel = String(typed.hires_upscale_model ?? typed.hiresUpscaleModel ?? '').trim();

  if (!inputImageName.trim()) throw new HttpError('ComfyUI Hires Fix requires one uploaded input image.', 400);
  if (hiresUpscaleMode === 'ai' && !hiresUpscaleModel) throw new HttpError('ComfyUI Hires Fix AI Upscale mode requires an upscale model.', 400);

  return {
    ...base,
    batchSize: 1,
    providerMode: 'comfyui.hires-fix',
    hiresUpscaleMode,
    hiresUpscaleModel: hiresUpscaleMode === 'ai' ? hiresUpscaleModel : undefined,
    inputImageName
  };
}

function addModelConditioningNodes(workflow: ComfyUiWorkflow, config: ComfyUiResolvedGenerationConfig) {
  workflow['4'] = { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: config.checkpoint } };

  const allocator: ComfyUiWorkflowNodeAllocator = createComfyUiNodeAllocator(workflow, 10);
  const conditionedRefs = applyComfyUiModelConditioningExtensions(
    { workflow, config, nextNodeId: allocator.nextNodeId },
    { modelRef: ['4', 0] as ComfyUiNodeRef, clipRef: ['4', 1] as ComfyUiNodeRef }
  );

  workflow['6'] = { class_type: 'CLIPTextEncode', inputs: { text: config.prompt, clip: conditionedRefs.clipRef } };
  workflow['7'] = { class_type: 'CLIPTextEncode', inputs: { text: config.negativePrompt, clip: conditionedRefs.clipRef } };

  return {
    modelRef: conditionedRefs.modelRef,
    clipRef: conditionedRefs.clipRef,
    vaeRef: ['4', 2] as ComfyUiNodeRef,
    positiveRef: ['6', 0] as ComfyUiNodeRef,
    negativeRef: ['7', 0] as ComfyUiNodeRef,
    nextNodeId: allocator.nextNodeId
  };
}

type ComfyUiConditioningRefs = ReturnType<typeof addModelConditioningNodes>;

function addTiledVaeInputs(config: ComfyUiResolvedGenerationConfig) {
  return {
    tile_size: config.workflowPlugins.tiledVae.tileSize,
    overlap: config.workflowPlugins.tiledVae.overlap,
    temporal_size: config.workflowPlugins.tiledVae.temporalSize,
    temporal_overlap: config.workflowPlugins.tiledVae.temporalOverlap
  };
}

function addVaeEncodeNode(workflow: ComfyUiWorkflow, config: ComfyUiResolvedGenerationConfig, refs: ComfyUiConditioningRefs, pixels: ComfyUiNodeRef): ComfyUiNodeRef {
  const nodeId = refs.nextNodeId();
  workflow[nodeId] = {
    class_type: config.workflowPlugins.tiledVae.encode ? 'VAEEncodeTiled' : 'VAEEncode',
    inputs: {
      pixels,
      vae: refs.vaeRef,
      ...(config.workflowPlugins.tiledVae.encode ? addTiledVaeInputs(config) : {})
    }
  };
  return [nodeId, 0];
}

function addSamplerNode(workflow: ComfyUiWorkflow, config: ComfyUiResolvedGenerationConfig, refs: ComfyUiConditioningRefs, latentRef: ComfyUiNodeRef): ComfyUiNodeRef {
  if (config.workflowPlugins.perpGuider.enabled) {
    const blankNode = refs.nextNodeId();
    const guiderNode = refs.nextNodeId();
    const noiseNode = refs.nextNodeId();
    const samplerNode = refs.nextNodeId();
    const sigmasNode = refs.nextNodeId();
    const customSamplerNode = '3';
    const blankBranchInput = 'empty' + '_conditioning';

    workflow[blankNode] = {
      class_type: 'CLIPTextEncode',
      inputs: { text: config.workflowPlugins.perpGuider.blankConditioning, clip: refs.clipRef }
    };
    workflow[guiderNode] = {
      class_type: 'PerpNegGuider',
      inputs: {
        model: refs.modelRef,
        positive: refs.positiveRef,
        negative: refs.negativeRef,
        [blankBranchInput]: [blankNode, 0],
        cfg: config.cfg,
        neg_scale: config.workflowPlugins.perpGuider.negScale
      }
    };
    workflow[noiseNode] = { class_type: 'RandomNoise', inputs: { noise_seed: config.seed } };
    workflow[samplerNode] = { class_type: 'KSamplerSelect', inputs: { sampler_name: config.samplerName } };
    workflow[sigmasNode] = { class_type: 'BasicScheduler', inputs: { model: refs.modelRef, scheduler: config.scheduler, steps: config.steps, denoise: config.denoise } };
    workflow[customSamplerNode] = {
      class_type: 'SamplerCustomAdvanced',
      inputs: { noise: [noiseNode, 0], guider: [guiderNode, 0], sampler: [samplerNode, 0], sigmas: [sigmasNode, 0], latent_image: latentRef }
    };
    return [customSamplerNode, 0];
  }

  if (config.workflowPlugins.tiledGeneration.enabled && config.workflowPlugins.tiledGeneration.backend === 'bnk_tiled_ksampler') {
    workflow['3'] = {
      class_type: 'BNK_TiledKSampler',
      inputs: {
        model: refs.modelRef,
        seed: config.seed,
        tile_width: config.workflowPlugins.tiledGeneration.tileWidth,
        tile_height: config.workflowPlugins.tiledGeneration.tileHeight,
        tiling_strategy: config.workflowPlugins.tiledGeneration.tilingStrategy,
        steps: config.steps,
        cfg: config.cfg,
        sampler_name: config.samplerName,
        scheduler: config.scheduler,
        positive: refs.positiveRef,
        negative: refs.negativeRef,
        latent_image: latentRef,
        denoise: config.denoise
      }
    };
    return ['3', 0];
  }

  workflow['3'] = {
    class_type: 'KSampler',
    inputs: {
      seed: config.seed,
      steps: config.steps,
      cfg: config.cfg,
      sampler_name: config.samplerName,
      scheduler: config.scheduler,
      denoise: config.denoise,
      model: refs.modelRef,
      positive: refs.positiveRef,
      negative: refs.negativeRef,
      latent_image: latentRef
    }
  };
  return ['3', 0];
}

function addVaeDecodeAndSave(workflow: ComfyUiWorkflow, config: ComfyUiResolvedGenerationConfig, refs: ComfyUiConditioningRefs, samples: ComfyUiNodeRef) {
  workflow['8'] = {
    class_type: config.workflowPlugins.tiledVae.decode ? 'VAEDecodeTiled' : 'VAEDecode',
    inputs: {
      samples,
      vae: refs.vaeRef,
      ...(config.workflowPlugins.tiledVae.decode ? addTiledVaeInputs(config) : {})
    }
  };
  workflow['9'] = { class_type: 'SaveImage', inputs: { filename_prefix: config.filenamePrefix, images: ['8', 0] } };
}

export function buildComfyUiTextToImageWorkflow(config: ComfyUiResolvedGenerationConfig): ComfyUiWorkflow {
  assertWorkflowPluginCompatibility(config.workflowPlugins);
  const workflow: ComfyUiWorkflow = {
    '5': { class_type: 'EmptyLatentImage', inputs: { width: config.width, height: config.height, batch_size: config.batchSize } }
  };
  const refs = addModelConditioningNodes(workflow, config);
  const sampledRef = addSamplerNode(workflow, config, refs, ['5', 0]);
  addVaeDecodeAndSave(workflow, config, refs, sampledRef);
  return workflow;
}

export function buildComfyUiHiresFixWorkflow(config: ComfyUiResolvedGenerationConfig): ComfyUiWorkflow {
  assertWorkflowPluginCompatibility(config.workflowPlugins);
  if (!config.inputImageName) throw new HttpError('ComfyUI Hires Fix workflow requires an uploaded input image.', 400);
  const workflow: ComfyUiWorkflow = {};
  const refs = addModelConditioningNodes(workflow, config);
  const loadImageNode = refs.nextNodeId();

  workflow[loadImageNode] = { class_type: 'LoadImage', inputs: { image: config.inputImageName } };

  let latentRef: ComfyUiNodeRef;
  if (config.hiresUpscaleMode === 'ai') {
    const modelLoaderNode = refs.nextNodeId();
    const imageUpscaleNode = refs.nextNodeId();
    const imageScaleNode = refs.nextNodeId();

    workflow[modelLoaderNode] = { class_type: 'UpscaleModelLoader', inputs: { model_name: config.hiresUpscaleModel } };
    workflow[imageUpscaleNode] = { class_type: 'ImageUpscaleWithModel', inputs: { upscale_model: [modelLoaderNode, 0], image: [loadImageNode, 0] } };
    workflow[imageScaleNode] = {
      class_type: 'ImageScale',
      inputs: { image: [imageUpscaleNode, 0], upscale_method: 'lanczos', width: config.width, height: config.height, crop: 'disabled' }
    };
    latentRef = addVaeEncodeNode(workflow, config, refs, [imageScaleNode, 0]);
  } else {
    const encodedRef = addVaeEncodeNode(workflow, config, refs, [loadImageNode, 0]);
    const latentUpscaleNode = refs.nextNodeId();
    workflow[latentUpscaleNode] = {
      class_type: 'LatentUpscale',
      inputs: { samples: encodedRef, upscale_method: 'nearest-exact', width: config.width, height: config.height, crop: 'disabled' }
    };
    latentRef = [latentUpscaleNode, 0];
  }

  const sampledRef = addSamplerNode(workflow, config, refs, latentRef);
  addVaeDecodeAndSave(workflow, config, refs, sampledRef);
  return workflow;
}
