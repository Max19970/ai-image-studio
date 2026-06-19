import { HttpError, type ProviderSettings } from '../types';

export interface ComfyUiLoraInput {
  lora_name?: string;
  name?: string;
  strength_model?: number;
  strength_clip?: number;
  enabled?: boolean;
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
    loras: normalizeLoras(typed.loras)
  };
}

export function buildComfyUiTextToImageWorkflow(config: ComfyUiResolvedGenerationConfig): ComfyUiWorkflow {
  const workflow: ComfyUiWorkflow = {
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: config.checkpoint }
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width: config.width, height: config.height, batch_size: config.batchSize }
    }
  };

  let modelRef: [string, number] = ['4', 0];
  let clipRef: [string, number] = ['4', 1];
  config.loras.forEach((lora, index) => {
    const nodeId = String(10 + index);
    workflow[nodeId] = {
      class_type: 'LoraLoader',
      inputs: {
        lora_name: lora.lora_name,
        strength_model: lora.strength_model,
        strength_clip: lora.strength_clip,
        model: modelRef,
        clip: clipRef
      }
    };
    modelRef = [nodeId, 0];
    clipRef = [nodeId, 1];
  });

  workflow['6'] = {
    class_type: 'CLIPTextEncode',
    inputs: { text: config.prompt, clip: clipRef }
  };
  workflow['7'] = {
    class_type: 'CLIPTextEncode',
    inputs: { text: config.negativePrompt, clip: clipRef }
  };
  workflow['3'] = {
    class_type: 'KSampler',
    inputs: {
      seed: config.seed,
      steps: config.steps,
      cfg: config.cfg,
      sampler_name: config.samplerName,
      scheduler: config.scheduler,
      denoise: config.denoise,
      model: modelRef,
      positive: ['6', 0],
      negative: ['7', 0],
      latent_image: ['5', 0]
    }
  };
  workflow['8'] = {
    class_type: 'VAEDecode',
    inputs: { samples: ['3', 0], vae: ['4', 2] }
  };
  workflow['9'] = {
    class_type: 'SaveImage',
    inputs: { filename_prefix: config.filenamePrefix, images: ['8', 0] }
  };

  return workflow;
}
