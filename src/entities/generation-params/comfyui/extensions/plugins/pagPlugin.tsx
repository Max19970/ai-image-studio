import { NumberPluginField } from '../workflowPluginFields';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';
import { pagPluginCore } from './pag.plugin';

export const pagPlugin: WorkflowPluginDefinition = {
  ...pagPluginCore,
  renderSettings: (context) => [
    <NumberPluginField key="pag-scale" context={context} labelKey="params.comfy.workflowPlugins.pag.scale" descriptionKey="params.comfy.workflowPlugins.pag.scale.description" stateKey="pagScale" min={0} max={100} step={0.01} />
  ]
};
