import {
  comfyUiSpotDiffusionShiftMethodOptions,
  comfyUiTiledDiffusionMethodOptions,
  comfyUiTiledGenerationBackendOptions,
  comfyUiTilingStrategyOptions
} from '../../state';
import { NumberPluginField, SelectPluginField } from '../workflowPluginFields';
import type { WorkflowPluginDefinition } from '../workflowPluginTypes';

export const tiledGenerationPlugin: WorkflowPluginDefinition = {
  kind: 'tiledGeneration',
  labelKey: 'params.comfy.workflowPlugins.tiledGeneration',
  descriptionKey: 'params.comfy.workflowPlugins.tiledGeneration.description',
  getSummary: (state) => state.tiledGenerationBackend === 'tiledDiffusion'
    ? `ComfyUI_TiledDiffusion · ${state.tiledDiffusionMethod}`
    : `BNK_TiledKSampler · ${state.tiledGenerationStrategy}`,
  renderSettings: (context, state) => {
    const usesBnk = state.tiledGenerationBackend === 'bnkTiledKSampler';
    const usesTiledDiffusion = state.tiledGenerationBackend === 'tiledDiffusion';
    return [
      <SelectPluginField key="tiled-generation-backend" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.backend" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.backend.description" stateKey="tiledGenerationBackend" options={comfyUiTiledGenerationBackendOptions} />,
      <NumberPluginField key="tiled-generation-width" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tileWidth" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tileWidth.description" stateKey="tiledGenerationTileWidth" min={256} max={8192} step={64} />,
      <NumberPluginField key="tiled-generation-height" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tileHeight" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tileHeight.description" stateKey="tiledGenerationTileHeight" min={256} max={8192} step={64} />,
      usesBnk ? <SelectPluginField key="tiled-generation-strategy" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.strategy" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.strategy.description" stateKey="tiledGenerationStrategy" options={comfyUiTilingStrategyOptions} /> : null,
      usesTiledDiffusion ? <SelectPluginField key="tiled-diffusion-method" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.method" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.method.description" stateKey="tiledDiffusionMethod" options={comfyUiTiledDiffusionMethodOptions} /> : null,
      usesTiledDiffusion ? <NumberPluginField key="tiled-diffusion-overlap" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.overlap" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.overlap.description" stateKey="tiledDiffusionTileOverlap" min={0} max={2048} step={32} /> : null,
      usesTiledDiffusion ? <NumberPluginField key="tiled-diffusion-batch" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.batchSize" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.batchSize.description" stateKey="tiledDiffusionTileBatchSize" min={1} max={8192} step={1} /> : null,
      usesTiledDiffusion && state.tiledDiffusionMethod === 'SpotDiffusion' ? <SelectPluginField key="spot-shift-method" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.shiftMethod" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.shiftMethod.description" stateKey="tiledDiffusionShiftMethod" options={comfyUiSpotDiffusionShiftMethodOptions} /> : null,
      usesTiledDiffusion && state.tiledDiffusionMethod === 'SpotDiffusion' ? <NumberPluginField key="spot-shift-seed" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.shiftSeed" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.shiftSeed.description" stateKey="tiledDiffusionShiftSeed" min={0} max={2147483647} step={1} /> : null
    ].filter(Boolean);
  }
};
