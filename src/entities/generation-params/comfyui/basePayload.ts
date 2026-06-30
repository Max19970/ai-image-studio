import type { ImageParams } from '../../../domain/imageParams';
import type { ProviderGenerationModeDefinition } from '../../../domain/providerMode';
import type { ProviderSettings } from '../../../domain/providerSettings';
import { resolveModeHiresScale, resolveModeImageSize } from '../../provider/valueConstraints';
import { readComfyUiParamState } from './state';

function isHiresFixMode(providerMode: ProviderGenerationModeDefinition | null | undefined): boolean {
  return providerMode?.id === 'comfyui.hires-fix';
}

export function buildComfyUiBasePayload(
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
    ...(state.seedMode === 'fixed' ? { seed: state.seed } : {})
  };
}
