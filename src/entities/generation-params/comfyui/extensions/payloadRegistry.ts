import type { ProviderGenerationExtension } from '../../extensionTypes';
import { comfyUiLoraPayloadExtension } from './loraPayloadExtension';
import { comfyUiWorkflowPluginsPayloadExtension } from './workflowPluginsPayloadExtension';

export const comfyUiPayloadExtensions = [
  comfyUiWorkflowPluginsPayloadExtension,
  comfyUiLoraPayloadExtension
] as const satisfies readonly ProviderGenerationExtension[];
