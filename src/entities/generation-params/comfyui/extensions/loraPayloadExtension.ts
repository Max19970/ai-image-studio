import type { ProviderRequestParameterSummaryEntry } from '../../../../domain/generationTask';
import type { ProviderGenerationExtension } from '../../extensionTypes';
import { readComfyUiParamState, type ComfyUiLoraSelection } from '../state';

export function getEnabledComfyUiLoras(loras: readonly ComfyUiLoraSelection[]) {
  return loras.filter((lora) => lora.enabled && lora.name.trim());
}

export function buildComfyUiLoraPayload(loras: readonly ComfyUiLoraSelection[]): Record<string, unknown> {
  const active = getEnabledComfyUiLoras(loras);
  if (!active.length) return {};
  return {
    loras: active.map((lora) => ({
      lora_name: lora.name,
      strength_model: lora.strengthModel,
      strength_clip: lora.strengthClip
    }))
  };
}

export function createComfyUiLoraSummaryEntry(loras: readonly ComfyUiLoraSelection[]): ProviderRequestParameterSummaryEntry {
  const active = getEnabledComfyUiLoras(loras);
  return {
    id: 'loras',
    label: 'LoRA stack',
    value: active.length ? active.map((lora) => `${lora.name} (${lora.strengthModel}/${lora.strengthClip})`).join(', ') : 'none',
    rawValue: loras
  };
}

export const comfyUiLoraPayloadExtension: ProviderGenerationExtension = {
  id: 'comfyui.extension.lora-stack.payload',
  order: 30,
  buildPayload: ({ params, provider }) => buildComfyUiLoraPayload(readComfyUiParamState(params, provider).loras),
  captureParameterSummaryEntries: ({ params, provider }) => [createComfyUiLoraSummaryEntry(readComfyUiParamState(params, provider).loras)]
};
