import type { ProviderGenerationExtension } from '../../extensionTypes';
import { comfyUiLoraPayloadExtension } from './loraPayloadExtension';

export const comfyUiPayloadExtensions = [
  comfyUiLoraPayloadExtension
] as const satisfies readonly ProviderGenerationExtension[];
