import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderSettings } from '../../../domain/providerSettings';
import { isPlainRecord, readProviderParamState } from '../providerState';
import { workflowPluginDefinitions, workflowPluginKindAliases } from './extensions/plugins';
import {
  COMFYUI_MAX_SEED,
  comfyUiSamplerOptions,
  comfyUiSchedulerOptions,
  comfyUiSpotDiffusionShiftMethodOptions,
  comfyUiTiledDiffusionMethodOptions,
  comfyUiTiledGenerationBackendOptions,
  comfyUiTilingStrategyOptions,
  comfyUiWorkflowBuilderItemOptions,
  defaultComfyUiParamState
} from './stateDefaults';
import type { ProviderParamState } from '../surfaceTypes';
import type { ComfyUiLoraSelection, ComfyUiParamState, ComfyUiWorkflowBuilderItemKind } from './stateTypes';

export const COMFYUI_SURFACE_ID = 'comfyui.text-to-image';

export type {
  ComfyUiLoraSelection,
  ComfyUiParamState,
  ComfyUiSpotDiffusionShiftMethod,
  ComfyUiTiledDiffusionMethod,
  ComfyUiTiledGenerationBackend,
  ComfyUiTilingStrategy,
  ComfyUiWorkflowBuilderItemKind
} from './stateTypes';

export {
  COMFYUI_MAX_SEED,
  comfyUiSamplerOptions,
  comfyUiSchedulerOptions,
  comfyUiSpotDiffusionShiftMethodOptions,
  comfyUiTiledDiffusionMethodOptions,
  comfyUiTiledGenerationBackendOptions,
  comfyUiTilingStrategyOptions,
  comfyUiWorkflowBuilderItemOptions,
  defaultComfyUiParamState
} from './stateDefaults';
export { toComfyUiProviderParamState } from './stateSerializers';

function numberInRange(value: unknown, fallback: number, min: number, max: number, round = false): number {
  const numeric = Number(value);
  const finite = Number.isFinite(numeric) ? numeric : fallback;
  const rounded = round ? Math.round(finite) : finite;
  return Math.min(max, Math.max(min, rounded));
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  return fallback;
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function normalizeLoras(value: unknown): ComfyUiLoraSelection[] {
  if (!Array.isArray(value)) return [];
  const byName = new Map<string, ComfyUiLoraSelection>();
  for (const item of value) {
    if (!isPlainRecord(item)) continue;
    const name = stringValue(item.name ?? item.lora_name).trim();
    if (!name) continue;
    const strengthModel = numberInRange(item.strengthModel ?? item.strength_model, 1, -10, 10);
    if (byName.has(name)) byName.delete(name);
    byName.set(name, {
      name,
      strengthModel,
      strengthClip: numberInRange(item.strengthClip ?? item.strength_clip, strengthModel, -10, 10),
      enabled: item.enabled !== false
    });
  }
  return [...byName.values()];
}

function normalizeWorkflowBuilderKind(value: unknown): ComfyUiWorkflowBuilderItemKind | null {
  if (typeof value !== 'string') return null;
  return workflowPluginKindAliases.get(value) ?? null;
}

function normalizeWorkflowBuilderList(value: unknown): ComfyUiWorkflowBuilderItemKind[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<ComfyUiWorkflowBuilderItemKind>();
  return value.flatMap((item): ComfyUiWorkflowBuilderItemKind[] => {
    const kind = normalizeWorkflowBuilderKind(item);
    if (!kind || seen.has(kind)) return [];
    seen.add(kind);
    return [kind];
  });
}

function legacyWorkflowBuilder(source: Record<string, unknown>, loras: readonly ComfyUiLoraSelection[]): ComfyUiWorkflowBuilderItemKind[] {
  const next: ComfyUiWorkflowBuilderItemKind[] = [];
  for (const definition of workflowPluginDefinitions) {
    if (definition.kind === 'loraStack' && loras.some((lora) => lora.enabled && lora.name.trim())) {
      next.push(definition.kind);
      continue;
    }
    const keys = [definition.kind, definition.payloadKey, ...(definition.legacyPayloadKeys ?? []), ...(definition.legacyKinds ?? [])];
    if (keys.some((key) => booleanValue(source[`${key}Enabled`] ?? source[`${key}_enabled`] ?? source[key]))) next.push(definition.kind);
  }
  return next;
}

export function normalizeComfyUiParamState(value: unknown): ComfyUiParamState {
  const source = isPlainRecord(value) ? value : {};
  const loras = normalizeLoras(source.loras);
  const workflowBuilderSource = normalizeWorkflowBuilderList(source.workflowBuilder ?? source.workflow_builder);
  const explicitWorkflowBuilder = workflowBuilderSource !== null;
  const workflowBuilder = workflowBuilderSource ?? legacyWorkflowBuilder(source, loras);
  const workflowBuilderSet = new Set(workflowBuilder);
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
    workflowBuilder,
    tiledGenerationEnabled: workflowBuilderSet.has('tiledGeneration'),
    tiledGenerationBackend: enumValue(source.tiledGenerationBackend ?? source.tiled_generation_backend, comfyUiTiledGenerationBackendOptions, defaultComfyUiParamState.tiledGenerationBackend),
    tiledGenerationTileWidth: numberInRange(source.tiledGenerationTileWidth ?? source.tiled_generation_tile_width, defaultComfyUiParamState.tiledGenerationTileWidth, 256, 8192, true),
    tiledGenerationTileHeight: numberInRange(source.tiledGenerationTileHeight ?? source.tiled_generation_tile_height, defaultComfyUiParamState.tiledGenerationTileHeight, 256, 8192, true),
    tiledGenerationStrategy: enumValue(source.tiledGenerationStrategy ?? source.tiled_generation_strategy, comfyUiTilingStrategyOptions, defaultComfyUiParamState.tiledGenerationStrategy),
    tiledDiffusionMethod: enumValue(source.tiledDiffusionMethod ?? source.tiled_diffusion_method, comfyUiTiledDiffusionMethodOptions, defaultComfyUiParamState.tiledDiffusionMethod),
    tiledDiffusionTileOverlap: numberInRange(source.tiledDiffusionTileOverlap ?? source.tiled_diffusion_tile_overlap, defaultComfyUiParamState.tiledDiffusionTileOverlap, 0, 2048, true),
    tiledDiffusionTileBatchSize: numberInRange(source.tiledDiffusionTileBatchSize ?? source.tiled_diffusion_tile_batch_size, defaultComfyUiParamState.tiledDiffusionTileBatchSize, 1, 8192, true),
    tiledDiffusionShiftMethod: enumValue(source.tiledDiffusionShiftMethod ?? source.tiled_diffusion_shift_method, comfyUiSpotDiffusionShiftMethodOptions, defaultComfyUiParamState.tiledDiffusionShiftMethod),
    tiledDiffusionShiftSeed: numberInRange(source.tiledDiffusionShiftSeed ?? source.tiled_diffusion_shift_seed, defaultComfyUiParamState.tiledDiffusionShiftSeed, 0, COMFYUI_MAX_SEED, true),
    tiledVaeEncodeEnabled: workflowBuilderSet.has('tiledVae') && booleanValue(source.tiledVaeEncodeEnabled ?? source.tiled_vae_encode_enabled, explicitWorkflowBuilder),
    tiledVaeDecodeEnabled: workflowBuilderSet.has('tiledVae') && booleanValue(source.tiledVaeDecodeEnabled ?? source.tiled_vae_decode_enabled, explicitWorkflowBuilder),
    tiledVaeTileSize: numberInRange(source.tiledVaeTileSize ?? source.tiled_vae_tile_size, defaultComfyUiParamState.tiledVaeTileSize, 64, 4096, true),
    tiledVaeOverlap: numberInRange(source.tiledVaeOverlap ?? source.tiled_vae_overlap, defaultComfyUiParamState.tiledVaeOverlap, 0, 4096, true),
    tiledVaeTemporalSize: numberInRange(source.tiledVaeTemporalSize ?? source.tiled_vae_temporal_size, defaultComfyUiParamState.tiledVaeTemporalSize, 8, 4096, true),
    tiledVaeTemporalOverlap: numberInRange(source.tiledVaeTemporalOverlap ?? source.tiled_vae_temporal_overlap, defaultComfyUiParamState.tiledVaeTemporalOverlap, 4, 4096, true),
    pagEnabled: workflowBuilderSet.has('pag'),
    pagScale: numberInRange(source.pagScale ?? source.pag_scale, defaultComfyUiParamState.pagScale, 0, 100),
    freeuV2Enabled: workflowBuilderSet.has('freeuV2'),
    freeuV2B1: numberInRange(source.freeuV2B1 ?? source.freeu_v2_b1, defaultComfyUiParamState.freeuV2B1, 0, 10),
    freeuV2B2: numberInRange(source.freeuV2B2 ?? source.freeu_v2_b2, defaultComfyUiParamState.freeuV2B2, 0, 10),
    freeuV2S1: numberInRange(source.freeuV2S1 ?? source.freeu_v2_s1, defaultComfyUiParamState.freeuV2S1, 0, 10),
    freeuV2S2: numberInRange(source.freeuV2S2 ?? source.freeu_v2_s2, defaultComfyUiParamState.freeuV2S2, 0, 10),
    perpGuiderEnabled: workflowBuilderSet.has('perpGuider'),
    perpGuiderScale: numberInRange(source.perpGuiderScale ?? source.perp_guider_scale, defaultComfyUiParamState.perpGuiderScale, 0, 100),
    perpGuiderBlankConditioning: stringValue(source.perpGuiderBlankConditioning ?? source.perp_guider_blank_conditioning, defaultComfyUiParamState.perpGuiderBlankConditioning),
    loras
  };
}

export function readComfyUiParamState(params: ImageParams, provider: ProviderSettings): ComfyUiParamState {
  return normalizeComfyUiParamState(readProviderParamState(params, provider, defaultComfyUiParamState as unknown as ProviderParamState));
}

