import type { ProviderRequestParameterSummary } from '../../../domain/generationTask';
import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderSettings } from '../../../domain/providerSettings';
import { isPlainRecord, readProviderParamState } from '../providerState';
import type { ProviderParamState } from '../surfaceTypes';

export const COMFYUI_SURFACE_ID = 'comfyui.text-to-image';

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
    loras: state.loras.map((lora) => ({ ...lora }))
  };
}

export function buildComfyUiPayload(params: ImageParams, provider: ProviderSettings): Record<string, unknown> {
  const state = readComfyUiParamState(params, provider);
  return {
    prompt: params.prompt.trim(),
    checkpoint: provider.modelId.trim(),
    width: state.width,
    height: state.height,
    batch_size: state.batchSize,
    steps: state.steps,
    cfg: state.cfg,
    sampler_name: state.samplerName,
    scheduler: state.scheduler,
    denoise: state.denoise,
    filename_prefix: state.filenamePrefix,
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

export function createComfyUiParameterSummary(state: ComfyUiParamState, provider: ProviderSettings): ProviderRequestParameterSummary {
  const seedValue = state.seedMode === 'fixed' ? String(state.seed) : 'random';
  const entries = [
    { id: 'checkpoint', label: 'Checkpoint', value: provider.modelId || 'not selected', rawValue: provider.modelId },
    { id: 'size', label: 'Size', value: `${state.width}×${state.height}`, rawValue: { width: state.width, height: state.height } },
    { id: 'batchSize', label: 'Batch size', value: String(state.batchSize), rawValue: state.batchSize },
    { id: 'steps', label: 'Steps', value: String(state.steps), rawValue: state.steps },
    { id: 'cfg', label: 'CFG', value: String(state.cfg), rawValue: state.cfg },
    { id: 'sampler', label: 'Sampler', value: state.samplerName, rawValue: state.samplerName },
    { id: 'scheduler', label: 'Scheduler', value: state.scheduler, rawValue: state.scheduler },
    { id: 'seed', label: 'Seed', value: seedValue, rawValue: state.seedMode === 'fixed' ? state.seed : null },
    { id: 'denoise', label: 'Denoise', value: String(state.denoise), rawValue: state.denoise },
    { id: 'filenamePrefix', label: 'Filename prefix', value: state.filenamePrefix, rawValue: state.filenamePrefix },
    { id: 'loras', label: 'LoRA stack', value: state.loras.filter((lora) => lora.enabled).length ? state.loras.filter((lora) => lora.enabled).map((lora) => `${lora.name} (${lora.strengthModel}/${lora.strengthClip})`).join(', ') : 'none', rawValue: state.loras }
  ];

  if (state.negativePrompt.trim()) entries.push({ id: 'negativePrompt', label: 'Negative prompt', value: state.negativePrompt.trim(), rawValue: state.negativePrompt.trim() });

  return {
    surfaceId: COMFYUI_SURFACE_ID,
    title: 'ComfyUI workflow parameters',
    entries
  };
}
