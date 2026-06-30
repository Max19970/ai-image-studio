import { InlineBooleanPluginField, NumberPluginField } from '../workflowPluginFields';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

export const tiledVaePlugin: WorkflowPluginDefinition = {
  kind: 'tiledVae',
  labelKey: 'params.comfy.workflowPlugins.tiledVae',
  descriptionKey: 'params.comfy.workflowPlugins.tiledVae.description',
  getSummary: (state) => `${state.tiledVaeEncodeEnabled ? 'encode' : ''}${state.tiledVaeEncodeEnabled && state.tiledVaeDecodeEnabled ? ' + ' : ''}${state.tiledVaeDecodeEnabled ? 'decode' : ''} · tile ${state.tiledVaeTileSize}` || `tile ${state.tiledVaeTileSize}`,
  renderSettings: (context) => [
    <InlineBooleanPluginField key="tiled-vae-encode" context={context} labelKey="params.comfy.workflowPlugins.tiledVaeEncode" descriptionKey="params.comfy.workflowPlugins.tiledVaeEncode.description" stateKey="tiledVaeEncodeEnabled" />,
    <InlineBooleanPluginField key="tiled-vae-decode" context={context} labelKey="params.comfy.workflowPlugins.tiledVaeDecode" descriptionKey="params.comfy.workflowPlugins.tiledVaeDecode.description" stateKey="tiledVaeDecodeEnabled" />,
    <NumberPluginField key="tiled-vae-tile-size" context={context} labelKey="params.comfy.workflowPlugins.tiledVae.tileSize" descriptionKey="params.comfy.workflowPlugins.tiledVae.tileSize.description" stateKey="tiledVaeTileSize" min={64} max={4096} step={32} />,
    <NumberPluginField key="tiled-vae-overlap" context={context} labelKey="params.comfy.workflowPlugins.tiledVae.overlap" descriptionKey="params.comfy.workflowPlugins.tiledVae.overlap.description" stateKey="tiledVaeOverlap" min={0} max={4096} step={32} />,
    <NumberPluginField key="tiled-vae-temporal-size" context={context} labelKey="params.comfy.workflowPlugins.tiledVae.temporalSize" descriptionKey="params.comfy.workflowPlugins.tiledVae.temporalSize.description" stateKey="tiledVaeTemporalSize" min={8} max={4096} step={8} />,
    <NumberPluginField key="tiled-vae-temporal-overlap" context={context} labelKey="params.comfy.workflowPlugins.tiledVae.temporalOverlap" descriptionKey="params.comfy.workflowPlugins.tiledVae.temporalOverlap.description" stateKey="tiledVaeTemporalOverlap" min={4} max={4096} step={4} />
  ]
};
