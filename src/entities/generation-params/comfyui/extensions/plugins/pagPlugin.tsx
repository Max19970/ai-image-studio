import { NumberPluginField } from '../workflowPluginFields';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

export const pagPlugin: WorkflowPluginDefinition = {
  kind: 'pag',
  labelKey: 'params.comfy.workflowPlugins.pag',
  descriptionKey: 'params.comfy.workflowPlugins.pag.description',
  getSummary: (state) => `scale ${state.pagScale}`,
  renderSettings: (context) => [
    <NumberPluginField key="pag-scale" context={context} labelKey="params.comfy.workflowPlugins.pag.scale" descriptionKey="params.comfy.workflowPlugins.pag.scale.description" stateKey="pagScale" min={0} max={100} step={0.01} />
  ]
};
