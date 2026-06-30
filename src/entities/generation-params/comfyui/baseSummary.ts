import type { ProviderRequestParameterSummary } from '../../../domain/generationTask';
import type { ProviderGenerationModeDefinition } from '../../../domain/providerMode';
import type { ProviderSettings } from '../../../domain/providerSettings';
import { resolveModeHiresScale, resolveModeImageSize } from '../../provider/valueConstraints';
import type { ComfyUiParamState } from './stateTypes';

function isHiresFixMode(providerMode: ProviderGenerationModeDefinition | null | undefined): boolean {
  return providerMode?.id === 'comfyui.hires-fix';
}

export function createComfyUiBaseParameterSummary(
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
    { id: 'resolvedSize', label: 'Resolved size', value: `${resolvedSize.width}×${resolvedSize.height}`, rawValue: resolvedSize },
    { id: 'batchSize', label: 'Batch size', value: String(hiresFix ? 1 : state.batchSize), rawValue: hiresFix ? 1 : state.batchSize },
    { id: 'steps', label: 'Steps', value: String(state.steps), rawValue: state.steps },
    { id: 'cfg', label: 'CFG', value: String(state.cfg), rawValue: state.cfg },
    { id: 'sampler', label: 'Sampler', value: state.samplerName, rawValue: state.samplerName },
    { id: 'scheduler', label: 'Scheduler', value: state.scheduler, rawValue: state.scheduler },
    { id: 'seed', label: 'Seed', value: seedValue, rawValue: state.seedMode === 'fixed' ? state.seed : null },
    { id: 'denoise', label: 'Denoise', value: String(state.denoise), rawValue: state.denoise },
    { id: 'filenamePrefix', label: 'Filename prefix', value: state.filenamePrefix, rawValue: state.filenamePrefix }
  ];

  if (hiresFix) {
    entries.push({ id: 'hiresUpscaleMode', label: 'Hires Fix upscale', value: state.hiresUpscaleMode === 'ai' ? 'AI upscale' : 'Latent upscale', rawValue: state.hiresUpscaleMode });
    if (state.hiresUpscaleMode === 'ai') {
      entries.push({ id: 'hiresUpscaleModel', label: 'AI upscale model', value: state.hiresUpscaleModel || 'not selected', rawValue: state.hiresUpscaleModel });
    }
  }

  if (state.negativePrompt.trim()) entries.push({ id: 'negativePrompt', label: 'Negative prompt', value: state.negativePrompt.trim(), rawValue: state.negativePrompt.trim() });

  return {
    surfaceId: 'comfyui.text-to-image',
    title: 'ComfyUI workflow parameters',
    entries
  };
}
