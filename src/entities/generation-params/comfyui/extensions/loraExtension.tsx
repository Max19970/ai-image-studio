import type { ProviderGenerationExtension } from '../../extensionTypes';
import type { ProviderGenerationSurfaceContext, ProviderGenerationSurfacePatchContext } from '../../surfaceTypes';
import type { GenerationParamSlot } from '../../types';
import { readComfyUiParamState } from '../state';
import { getEnabledComfyUiLoras } from './loraPayloadExtension';

function loraTabStat(context: ProviderGenerationSurfaceContext) {
  const state = readComfyUiParamState(context.params, context.provider);
  const activeCount = getEnabledComfyUiLoras(state.loras).length;
  return activeCount ? `${activeCount} LoRA` : 'no LoRA';
}

function renderLoraSlot(_slot: GenerationParamSlot, _context: ProviderGenerationSurfacePatchContext) {
  return [];
}

export const comfyUiLoraGenerationExtension: ProviderGenerationExtension = {
  id: 'comfyui.extension.lora-stack.ui',
  order: 30,
  getTabStats: (context) => ({ service: loraTabStat(context) }),
  renderSlot: renderLoraSlot
};
