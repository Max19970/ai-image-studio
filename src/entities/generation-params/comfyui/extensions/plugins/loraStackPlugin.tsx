import { LoraStackField } from '../../ComfyUiLoraStackField';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

export const loraStackPlugin: WorkflowPluginDefinition = {
  kind: 'loraStack',
  labelKey: 'params.comfy.workflowPlugins.loraStack',
  descriptionKey: 'params.comfy.workflowPlugins.loraStack.description',
  getSummary: (state) => `${state.loras.filter((lora) => lora.enabled && lora.name.trim()).length} LoRA`,
  renderSettings: (context) => [<LoraStackField key="lora-stack-field" context={context} />]
};
