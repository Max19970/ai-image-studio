import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

export const loraStackPluginCore: WorkflowPluginDefinition = {
  kind: 'loraStack',
  payloadKey: 'lora_stack',
  legacyKinds: ['lora_stack'],
  order: 35,
  isActive: (state) => state.workflowBuilder.includes('loraStack'),
  enableInState: () => ({}),
  labelKey: 'params.comfy.workflowPlugins.loraStack',
  descriptionKey: 'params.comfy.workflowPlugins.loraStack.description',
  getSummary: (state) => `${state.loras.filter((lora) => lora.enabled && lora.name.trim()).length} LoRA`,
  renderSettings: () => []
};
