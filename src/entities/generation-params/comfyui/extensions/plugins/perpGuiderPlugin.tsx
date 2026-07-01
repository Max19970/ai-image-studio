import { NumberPluginField, TextPluginField } from '../workflowPluginFields';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';
import { perpGuiderPluginCore } from './perpGuider.plugin';

export const perpGuiderPlugin: WorkflowPluginDefinition = {
  ...perpGuiderPluginCore,
  renderSettings: (context) => [
    <NumberPluginField key="perp-scale" context={context} labelKey="params.comfy.workflowPlugins.perpGuider.scale" descriptionKey="params.comfy.workflowPlugins.perpGuider.scale.description" stateKey="perpGuiderScale" min={0} max={100} step={0.01} />,
    <TextPluginField key="perp-blank" context={context} labelKey="params.comfy.workflowPlugins.perpGuider.blank" descriptionKey="params.comfy.workflowPlugins.perpGuider.blank.description" stateKey="perpGuiderBlankConditioning" />
  ]
};
