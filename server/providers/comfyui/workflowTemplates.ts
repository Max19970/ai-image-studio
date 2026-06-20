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
}

export type ComfyUiWorkflowNode = {
  class_type: string;
  inputs: Record<string, unknown>;
};

export type ComfyUiWorkflow = Record<string, ComfyUiWorkflowNode>;

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

export function resolveComfyUiGenerationConfig(provider: ProviderSettings, payload: Record<string, unknown>): ComfyUiResolvedGenerationConfig {
  const typed = payload as unknown as ComfyUiGenerationPayload;
  const prompt = String(typed.prompt ?? '').trim();
  if (!prompt) throw new HttpError('Prompt is required before sending the ComfyUI request.', 400);

  const size = parseSize(typed.size);
  const width = clampInt(typed.width ?? size.width, 1024, MIN_SIZE, MAX_SIZE);
  const height = clampInt(typed.height ?? size.height, 1024, MIN_SIZE, MAX_SIZE);
  const checkpoint = String(typed.checkpoint ?? typed.ckpt_name ?? typed.model ?? provider.modelId ?? '').trim();
  if (!checkpoint) throw new HttpError('ComfyUI checkpoint is required. Select a checkpoint before generation.', 400);

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

  if (!inputImageName.trim()) {
    throw new HttpError('ComfyUI Hires Fix requires one uploaded input image.', 400);
  }
  if (hiresUpscaleMode === 'ai' && !hiresUpscaleModel) {
    throw new HttpError('ComfyUI Hires Fix AI Upscale mode requires an upscale model.', 400);
  }

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
  workflow['4'] = {
    class_type: 'CheckpointLoaderSimple',
    inputs: { ckpt_name: config.checkpoint }
  };

  const allocator: ComfyUiWorkflowNodeAllocator = createComfyUiNodeAllocator(workflow, 10);
  const conditionedRefs = applyComfyUiModelConditioningExtensions(
    { workflow, config, nextNodeId: allocator.nextNodeId },
    { modelRef: ['4', 0] as ComfyUiNodeRef, clipRef: ['4', 1] as ComfyUiNodeRef }
  );

  workflow['6'] = {
    class_type: 'CLIPTextEncode',
    inputs: { text: config.prompt, clip: conditionedRefs.clipRef }
  };
  workflow['7'] = {
    class_type: 'CLIPTextEncode',
    inputs: { text: config.negativePrompt, clip: conditionedRefs.clipRef }
  };

  return {
    modelRef: conditionedRefs.modelRef,
    vaeRef: ['4', 2] as ComfyUiNodeRef,
    positiveRef: ['6', 0] as ComfyUiNodeRef,
    negativeRef: ['7', 0] as ComfyUiNodeRef,
    nextNodeId: allocator.nextNodeId
  };
}

export function buildComfyUiTextToImageWorkflow(config: ComfyUiResolvedGenerationConfig): ComfyUiWorkflow {
  const workflow: ComfyUiWorkflow = {
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width: config.width, height: config.height, batch_size: config.batchSize }
    }
  };
  const refs = addModelConditioningNodes(workflow, config);

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
      latent_image: ['5', 0]
    }
  };
  workflow['8'] = {
    class_type: 'VAEDecode',
    inputs: { samples: ['3', 0], vae: refs.vaeRef }
  };
  workflow['9'] = {
    class_type: 'SaveImage',
    inputs: { filename_prefix: config.filenamePrefix, images: ['8', 0] }
  };

  return workflow;
}

export function buildComfyUiHiresFixWorkflow(config: ComfyUiResolvedGenerationConfig): ComfyUiWorkflow {
  if (!config.inputImageName) throw new HttpError('ComfyUI Hires Fix workflow requires an uploaded input image.', 400);
  const workflow: ComfyUiWorkflow = {};
  const refs = addModelConditioningNodes(workflow, config);
  const loadImageNode = refs.nextNodeId();

  workflow[loadImageNode] = {
    class_type: 'LoadImage',
    inputs: { image: config.inputImageName }
  };

  let latentRef: [string, number];
  if (config.hiresUpscaleMode === 'ai') {
    const modelLoaderNode = refs.nextNodeId();
    const imageUpscaleNode = refs.nextNodeId();
    const imageScaleNode = refs.nextNodeId();
    const vaeEncodeNode = refs.nextNodeId();

    workflow[modelLoaderNode] = {
      class_type: 'UpscaleModelLoader',
      inputs: { model_name: config.hiresUpscaleModel }
    };
    workflow[imageUpscaleNode] = {
      class_type: 'ImageUpscaleWithModel',
      inputs: { upscale_model: [modelLoaderNode, 0], image: [loadImageNode, 0] }
    };
    workflow[imageScaleNode] = {
      class_type: 'ImageScale',
      inputs: {
        image: [imageUpscaleNode, 0],
        upscale_method: 'lanczos',
        width: config.width,
        height: config.height,
        crop: 'disabled'
      }
    };
    workflow[vaeEncodeNode] = {
      class_type: 'VAEEncode',
      inputs: { pixels: [imageScaleNode, 0], vae: refs.vaeRef }
    };
    latentRef = [vaeEncodeNode, 0];
  } else {
    const vaeEncodeNode = refs.nextNodeId();
    const latentUpscaleNode = refs.nextNodeId();

    workflow[vaeEncodeNode] = {
      class_type: 'VAEEncode',
      inputs: { pixels: [loadImageNode, 0], vae: refs.vaeRef }
    };
    workflow[latentUpscaleNode] = {
      class_type: 'LatentUpscale',
      inputs: {
        samples: [vaeEncodeNode, 0],
        upscale_method: 'nearest-exact',
        width: config.width,
        height: config.height,
        crop: 'disabled'
      }
    };
    latentRef = [latentUpscaleNode, 0];
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
  workflow['8'] = {
    class_type: 'VAEDecode',
    inputs: { samples: ['3', 0], vae: refs.vaeRef }
  };
  workflow['9'] = {
    class_type: 'SaveImage',
    inputs: { filename_prefix: config.filenamePrefix, images: ['8', 0] }
  };

  return workflow;
}
