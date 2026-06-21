import type { ProviderGenerationExtension } from '../../extensionTypes';
import { comfyUiLoraGenerationExtension } from './loraExtension';
import { comfyUiWorkflowPluginsGenerationExtension } from './workflowPluginsExtension';

export const comfyUiGenerationExtensions = [
  comfyUiWorkflowPluginsGenerationExtension,
  comfyUiLoraGenerationExtension
] as const satisfies readonly ProviderGenerationExtension[];
