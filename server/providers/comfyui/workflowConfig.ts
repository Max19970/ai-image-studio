import { HttpError, type ProviderSettings } from '../types';
import { assertWorkflowPluginCompatibility } from './workflowPluginValidation';
import type {
  ComfyUiGenerationPayload,
  ComfyUiHiresUpscaleMode,
  ComfyUiLoraInput,
  ComfyUiResolvedGenerationConfig,
  ComfyUiResolvedWorkflowPlugins,
  ComfyUiSpotDiffusionShiftMethod,
  ComfyUiTiledDiffusionMethod,
  ComfyUiTiledGenerationBackend,
  ComfyUiTilingStrategy
} from './workflowTypes';

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

export function normalizeComfyUiWorkflowPlugins(typed: ComfyUiGenerationPayload): ComfyUiResolvedWorkflowPlugins {
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

export function resolveComfyUiGenerationConfig(provider: ProviderSettings, payload: Record<string, unknown>): ComfyUiResolvedGenerationConfig {
  const typed = payload as unknown as ComfyUiGenerationPayload;
  const prompt = String(typed.prompt ?? '').trim();
  if (!prompt) throw new HttpError('Prompt is required before sending the ComfyUI request.', 400);

  const size = parseSize(typed.size);
  const width = clampInt(typed.width ?? size.width, 1024, MIN_SIZE, MAX_SIZE);
  const height = clampInt(typed.height ?? size.height, 1024, MIN_SIZE, MAX_SIZE);
  const checkpoint = String(typed.checkpoint ?? typed.ckpt_name ?? typed.model ?? provider.modelId ?? '').trim();
  if (!checkpoint) throw new HttpError('ComfyUI checkpoint is required. Select a checkpoint before generation.', 400);
  const workflowPlugins = normalizeComfyUiWorkflowPlugins(typed);
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
