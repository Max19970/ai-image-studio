import { NumberPluginField } from '../workflowPluginFields';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';
import { freeuV2PluginCore } from './freeuV2.plugin';

const numberKeys = [
  ['b1', 'freeuV2B1'],
  ['b2', 'freeuV2B2'],
  ['s1', 'freeuV2S1'],
  ['s2', 'freeuV2S2']
] as const;

export const freeuV2Plugin: WorkflowPluginDefinition = {
  ...freeuV2PluginCore,
  renderSettings: (context) => numberKeys.map(([suffix, stateKey]) => (
    <NumberPluginField key={`freeu-v2-${suffix}`} context={context} labelKey={`params.comfy.workflowPlugins.freeuV2.${suffix}`} descriptionKey={`params.comfy.workflowPlugins.freeuV2.${suffix}.description`} stateKey={stateKey} min={0} max={10} step={0.01} />
  ))
};
