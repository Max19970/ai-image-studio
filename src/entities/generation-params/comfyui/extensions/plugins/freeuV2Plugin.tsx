import { NumberPluginField } from '../workflowPluginFields';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

const numberKeys = [
  ['b1', 'freeuV2B1'],
  ['b2', 'freeuV2B2'],
  ['s1', 'freeuV2S1'],
  ['s2', 'freeuV2S2']
] as const;

export const freeuV2Plugin: WorkflowPluginDefinition = {
  kind: 'freeuV2',
  labelKey: 'params.comfy.workflowPlugins.freeuV2',
  descriptionKey: 'params.comfy.workflowPlugins.freeuV2.description',
  getSummary: (state) => `b ${state.freeuV2B1}/${state.freeuV2B2} · s ${state.freeuV2S1}/${state.freeuV2S2}`,
  renderSettings: (context) => numberKeys.map(([suffix, stateKey]) => (
    <NumberPluginField key={`freeu-v2-${suffix}`} context={context} labelKey={`params.comfy.workflowPlugins.freeuV2.${suffix}`} descriptionKey={`params.comfy.workflowPlugins.freeuV2.${suffix}.description`} stateKey={stateKey} min={0} max={10} step={0.01} />
  ))
};
