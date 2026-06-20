import type { ProviderRequestParameterSummary } from '../../../domain/generationTask';
import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../../domain/providerMode';
import type { ProviderSettings } from '../../../domain/providerSettings';
import { resolveModeHiresScale, resolveModeImageSize } from '../../provider/valueConstraints';
import { isPlainRecord, readProviderParamState } from '../providerState';
import type { ProviderParamState } from '../surfaceTypes';

export const COMFYUI_SURFACE_ID = 'comfyui.text-to-image';
const COMFYUI_HIRES_FIX_MODE_ID = 'comfyui.hires-fix';

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
  loras: ComfyUiLoraSelection[];
}

export const COMFYUI_MAX_SEED = 2 ** 31 - 1;

export const comfyUiSamplerOptions = ['euler', 'euler_ancestral', 'heun', 'dpm_2', 'dpmpp_2m', 'dpmpp_sde', 'dpmpp_3m_sde'] as const;
export const comfyUiSchedulerOptions = ['normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform'] as const;

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
  loras: []
};

function numberInRange(value: unknown, fallback: number, min: number, max: number, round = false): number {
  const numeric = Number(value);
  const finite = Number.isFinite(numeric) ? numeric : fallback;
  const rounded = round ? Math.round(finite) : finite;
  return Math.min(max, Math.max(min, rounded));
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function isHiresFixMode(providerMode: ProviderGenerationModeDefinition | null | undefined): boolean {
  return providerMode?.id === COMFYUI_HIRES_FIX_MODE_ID;
}

function normalizeLoras(value: unknown): ComfyUiLoraSelection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ComfyUiLoraSelection[] => {
    if (!isPlainRecord(item)) return [];
    const name = stringValue(item.name ?? item.lora_name).trim();
    if (!name) return [];
    const strengthModel = numberInRange(item.strengthModel ?? item.strength_model, 1, -10, 10);
    return [{
      name,
      strengthModel,
      strengthClip: numberInRange(item.strengthClip ?? item.strength_clip, strengthModel, -10, 10),
      enabled: item.enabled !== false
    }];
  });
}

export function normalizeComfyUiParamState(value: unknown): ComfyUiParamState {
  const source = isPlainRecord(value) ? value : {};
  return {
    negativePrompt: stringValue(source.negativePrompt ?? source.negative_prompt),
    width: numberInRange(source.width, defaultComfyUiParamState.width, 64, 4096, true),
    height: numberInRange(source.height, defaultComfyUiParamState.height, 64, 4096, true),
    batchSize: numberInRange(source.batchSize ?? source.batch_size ?? source.n, defaultComfyUiParamState.batchSize, 1, 16, true),
    seedMode: enumValue(source.seedMode, ['random', 'fixed'] as const, defaultComfyUiParamState.seedMode),
    seed: numberInRange(source.seed, defaultComfyUiParamState.seed, 0, COMFYUI_MAX_SEED, true),
    steps: numberInRange(source.steps, defaultComfyUiParamState.steps, 1, 150, true),
    cfg: numberInRange(source.cfg, defaultComfyUiParamState.cfg, 0, 30),
    samplerName: stringValue(source.samplerName ?? source.sampler_name, defaultComfyUiParamState.samplerName).trim() || defaultComfyUiParamState.samplerName,
    scheduler: stringValue(source.scheduler, defaultComfyUiParamState.scheduler).trim() || defaultComfyUiParamState.scheduler,
    denoise: numberInRange(source.denoise, defaultComfyUiParamState.denoise, 0, 1),
    filenamePrefix: stringValue(source.filenamePrefix ?? source.filename_prefix, defaultComfyUiParamState.filenamePrefix).trim() || defaultComfyUiParamState.filenamePrefix,
    hiresUpscaleMode: enumValue(source.hiresUpscaleMode ?? source.hires_upscale_mode, ['latent', 'ai'] as const, defaultComfyUiParamState.hiresUpscaleMode),
    hiresUpscaleModel: stringValue(source.hiresUpscaleModel ?? source.hires_upscale_model, defaultComfyUiParamState.hiresUpscaleModel).trim(),
    hiresScale: numberInRange(source.hiresScale ?? source.hires_scale ?? source.hires_upscale_factor, defaultComfyUiParamState.hiresScale, 0.1, 8),
    hiresInputWidth: numberInRange(source.hiresInputWidth ?? source.hires_input_width, defaultComfyUiParamState.hiresInputWidth, 0, 4096, true),
    hiresInputHeight: numberInRange(source.hiresInputHeight ?? source.hires_input_height, defaultComfyUiParamState.hiresInputHeight, 0, 4096, true),
    loras: normalizeLoras(source.loras)
  };
}

export function readComfyUiParamState(params: ImageParams, provider: ProviderSettings): ComfyUiParamState {
  return normalizeComfyUiParamState(readProviderParamState(params, provider, defaultComfyUiParamState as unknown as ProviderParamState));
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
    loras: state.loras.map((lora) => ({ ...lora }))
  };
}

export function buildComfyUiPayload(
  params: ImageParams,
  provider: ProviderSettings,
  providerMode?: ProviderGenerationModeDefinition | null
): Record<string, unknown> {
  const state = readComfyUiParamState(params, provider);
  const hiresFix = isHiresFixMode(providerMode);
  const hiresScale = resolveModeHiresScale(state.hiresScale, providerMode);
  const sourceWidth = state.hiresInputWidth > 0 ? state.hiresInputWidth : state.width;
  const sourceHeight = state.hiresInputHeight > 0 ? state.hiresInputHeight : state.height;
  const size = hiresFix
    ? resolveModeImageSize(sourceWidth * hiresScale, sourceHeight * hiresScale, providerMode, { width: state.width, height: state.height })
    : resolveModeImageSize(state.width, state.height, providerMode, { width: state.width, height: state.height });
  return {
    prompt: params.prompt.trim(),
    checkpoint: provider.modelId.trim(),
    width: size.width,
    height: size.height,
    batch_size: hiresFix ? 1 : state.batchSize,
    steps: state.steps,
    cfg: state.cfg,
    sampler_name: state.samplerName,
    scheduler: state.scheduler,
    denoise: state.denoise,
    filename_prefix: state.filenamePrefix,
    ...(providerMode?.id ? { provider_mode: providerMode.id } : {}),
    ...(hiresFix ? {
      hires_upscale_mode: state.hiresUpscaleMode,
      hires_upscale_factor: hiresScale,
      hires_input_width: state.hiresInputWidth,
      hires_input_height: state.hiresInputHeight,
      ...(state.hiresUpscaleMode === 'ai' && state.hiresUpscaleModel.trim() ? { hires_upscale_model: state.hiresUpscaleModel.trim() } : {})
    } : {}),
    ...(state.negativePrompt.trim() ? { negative_prompt: state.negativePrompt.trim() } : {}),
    ...(state.seedMode === 'fixed' ? { seed: state.seed } : {}),
    ...(state.loras.some((lora) => lora.enabled) ? {
      loras: state.loras
        .filter((lora) => lora.enabled)
        .map((lora) => ({
          lora_name: lora.name,
          strength_model: lora.strengthModel,
          strength_clip: lora.strengthClip
        }))
    } : {})
  };
}

export function createComfyUiParameterSummary(
  state: ComfyUiParamState,
  provider: ProviderSettings,
  providerMode?: ProviderGenerationModeDefinition | null
): ProviderRequestParameterSummary {
  const seedValue = state.seedMode === 'fixed' ? String(state.seed) : 'random';
  const hiresFix = isHiresFixMode(providerMode);
  const hiresScale = resolveModeHiresScale(state.hiresScale, providerMode);
  const sourceWidth = state.hiresInputWidth > 0 ? state.hiresInputWidth : state.width;
  const sourceHeight = state.hiresInputHeight > 0 ? state.hiresInputHeight : state.height;
  const resolvedSize = hiresFix
    ? resolveModeImageSize(sourceWidth * hiresScale, sourceHeight * hiresScale, providerMode, { width: state.width, height: state.height })
    : resolveModeImageSize(state.width, state.height, providerMode, { width: state.width, height: state.height });
  const entries = [
    { id: 'mode', label: 'Provider mode', value: providerMode?.id ?? 'text-to-image', rawValue: providerMode?.id ?? null },
    { id: 'checkpoint', label: 'Checkpoint', value: provider.modelId || 'not selected', rawValue: provider.modelId },
    { id: hiresFix ? 'targetSize' : 'size', label: hiresFix ? 'Target size' : 'Size', value: `${state.width}×${state.height}`, rawValue: { width: state.width, height: state.height } },
    { id: 'batchSize', label: 'Batch size', value: String(hiresFix ? 1 : state.batchSize), rawValue: hiresFix ? 1 : state.batchSize },
    { id: 'steps', label: 'Steps', value: String(state.steps), rawValue: state.steps },
    { id: 'cfg', label: 'CFG', value: String(state.cfg), rawValue: state.cfg },
    { id: 'sampler', label: 'Sampler', value: state.samplerName, rawValue: state.samplerName },
    { id: 'scheduler', label: 'Scheduler', value: state.scheduler, rawValue: state.scheduler },
    { id: 'seed', label: 'Seed', value: seedValue, rawValue: state.seedMode === 'fixed' ? state.seed : null },
    { id: 'denoise', label: 'Denoise', value: String(state.denoise), rawValue: state.denoise },
    { id: 'filenamePrefix', label: 'Filename prefix', value: state.filenamePrefix, rawValue: state.filenamePrefix },
    { id: 'loras', label: 'LoRA stack', value: state.loras.filter((lora) => lora.enabled).length ? state.loras.filter((lora) => lora.enabled).map((lora) => `${lora.name} (${lora.strengthModel}/${lora.strengthClip})`).join(', ') : 'none', rawValue: state.loras }
  ];

  if (hiresFix) {
    entries.push({ id: 'hiresUpscaleMode', label: 'Hires Fix upscale', value: state.hiresUpscaleMode === 'ai' ? 'AI upscale' : 'Latent upscale', rawValue: state.hiresUpscaleMode });
    if (state.hiresUpscaleMode === 'ai') {
      entries.push({ id: 'hiresUpscaleModel', label: 'AI upscale model', value: state.hiresUpscaleModel || 'not selected', rawValue: state.hiresUpscaleModel });
    }
  }

  if (state.negativePrompt.trim()) entries.push({ id: 'negativePrompt', label: 'Negative prompt', value: state.negativePrompt.trim(), rawValue: state.negativePrompt.trim() });

  return {
    surfaceId: COMFYUI_SURFACE_ID,
    title: 'ComfyUI workflow parameters',
    entries
  };
}
