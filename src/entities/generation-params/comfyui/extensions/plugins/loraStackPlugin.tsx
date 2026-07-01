import { LoraStackField } from '../../ComfyUiLoraStackField';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';
import { loraStackPluginCore } from './loraStack.plugin';

export const loraStackPlugin: WorkflowPluginDefinition = {
  ...loraStackPluginCore,
  renderSettings: (context) => [<LoraStackField key="lora-stack" context={context} />]
};
