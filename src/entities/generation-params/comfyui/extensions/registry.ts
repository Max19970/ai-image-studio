import type { ProviderGenerationExtension } from '../../extensionTypes';
import { comfyUiLoraGenerationExtension } from './loraExtension';

export const comfyUiGenerationExtensions = [
  comfyUiLoraGenerationExtension
] as const satisfies readonly ProviderGenerationExtension[];
