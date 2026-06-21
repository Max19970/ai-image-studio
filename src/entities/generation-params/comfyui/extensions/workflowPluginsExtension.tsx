import type { ProviderGenerationExtension } from '../../extensionTypes';
import type { ProviderGenerationSurfaceContext, ProviderGenerationSurfacePatchContext } from '../../surfaceTypes';
import type { GenerationParamSlot } from '../../types';
import { useI18n } from '../../../../i18n';
import { PopoverSelect } from '../../../../shared/ui';
import { ParamField } from '../../support';
import controls from '../../ParamControls.module.css';
import {
  comfyUiSpotDiffusionShiftMethodOptions,
  comfyUiTiledDiffusionMethodOptions,
  comfyUiTiledGenerationBackendOptions,
  comfyUiTilingStrategyOptions,
  readComfyUiParamState,
  type ComfyUiParamState
} from '../state';

function patchState(context: ProviderGenerationSurfacePatchContext, key: keyof ComfyUiParamState, value: unknown) {
  context.patchProviderParam(key, value);
}

function enabledCount(state: ComfyUiParamState): number {
  return [state.tiledGenerationEnabled, state.tiledVaeEncodeEnabled || state.tiledVaeDecodeEnabled, state.pagEnabled, state.perpGuiderEnabled].filter(Boolean).length;
}

function pluginTabStat(context: ProviderGenerationSurfaceContext) {
  const state = readComfyUiParamState(context.params, context.provider);
  const count = enabledCount(state);
  return count ? `${count} add-on${count === 1 ? '' : 's'}` : 'base graph';
}

function ToggleField({ context, labelKey, descriptionKey, stateKey }: {
  context: ProviderGenerationSurfacePatchContext;
  labelKey: string;
  descriptionKey: string;
  stateKey: keyof ComfyUiParamState;
}) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  return (
    <div className={controls.flatCheckCard}>
      <ParamField label={t(labelKey)} description={t(descriptionKey)}>
        <label className={controls.inlineCheck}>
          <input type="checkbox" checked={Boolean(state[stateKey])} onChange={(event) => patchState(context, stateKey, event.target.checked)} />
          <span>{t('params.comfy.workflowPlugins.enable')}</span>
        </label>
      </ParamField>
    </div>
  );
}

function NumberPluginField({ context, labelKey, descriptionKey, stateKey, min, max, step = 1 }: {
  context: ProviderGenerationSurfacePatchContext;
  labelKey: string;
  descriptionKey: string;
  stateKey: keyof ComfyUiParamState;
  min: number;
  max: number;
  step?: number;
}) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  return (
    <ParamField label={t(labelKey)} description={t(descriptionKey)}>
      <input aria-label={t(labelKey)} className={controls.input} type="number" min={min} max={max} step={step} value={Number(state[stateKey] ?? 0)} onChange={(event) => patchState(context, stateKey, Number(event.target.value))} />
    </ParamField>
  );
}

function TextPluginField({ context, labelKey, descriptionKey, stateKey }: {
  context: ProviderGenerationSurfacePatchContext;
  labelKey: string;
  descriptionKey: string;
  stateKey: keyof ComfyUiParamState;
}) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  return (
    <div className={controls.fieldGridFull}>
      <ParamField label={t(labelKey)} description={t(descriptionKey)}>
        <input aria-label={t(labelKey)} className={controls.input} type="text" value={String(state[stateKey] ?? '')} onChange={(event) => patchState(context, stateKey, event.target.value)} />
      </ParamField>
    </div>
  );
}

function SelectPluginField<TValue extends string>({ context, labelKey, descriptionKey, stateKey, options }: {
  context: ProviderGenerationSurfacePatchContext;
  labelKey: string;
  descriptionKey: string;
  stateKey: keyof ComfyUiParamState;
  options: readonly TValue[];
}) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  return (
    <ParamField label={t(labelKey)} description={t(descriptionKey)}>
      <PopoverSelect
        value={String(state[stateKey]) as TValue}
        onChange={(next) => patchState(context, stateKey, next)}
        options={options.map((value) => ({ value, label: t(`${labelKey}.${value}`) }))}
        ariaLabel={t(labelKey)}
        className={controls.select}
        triggerClassName={controls.selectTrigger}
        panelClassName={controls.selectPanel}
      />
    </ParamField>
  );
}

function ConflictWarning() {
  return <div className={controls.fieldGridFull}><div className={controls.warningStrip}><p>BNK_TiledKSampler and PerpNegGuider cannot run together. Switch Tiled Generation to ComfyUI_TiledDiffusion or disable one of them.</p></div></div>;
}

function renderWorkflowPluginsSlot(slot: GenerationParamSlot, context: ProviderGenerationSurfacePatchContext) {
  if (slot !== 'composer/parameters/service') return [];
  const state = readComfyUiParamState(context.params, context.provider);
  const usesBnk = state.tiledGenerationBackend === 'bnkTiledKSampler';
  const usesTiledDiffusion = state.tiledGenerationBackend === 'tiledDiffusion';
  return [
    <ToggleField key="tiled-generation-toggle" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.description" stateKey="tiledGenerationEnabled" />,
    state.tiledGenerationEnabled ? <SelectPluginField key="tiled-generation-backend" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.backend" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.backend.description" stateKey="tiledGenerationBackend" options={comfyUiTiledGenerationBackendOptions} /> : null,
    state.tiledGenerationEnabled ? <NumberPluginField key="tiled-generation-width" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tileWidth" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tileWidth.description" stateKey="tiledGenerationTileWidth" min={256} max={8192} step={64} /> : null,
    state.tiledGenerationEnabled ? <NumberPluginField key="tiled-generation-height" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tileHeight" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tileHeight.description" stateKey="tiledGenerationTileHeight" min={256} max={8192} step={64} /> : null,
    state.tiledGenerationEnabled && usesBnk ? <SelectPluginField key="tiled-generation-strategy" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.strategy" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.strategy.description" stateKey="tiledGenerationStrategy" options={comfyUiTilingStrategyOptions} /> : null,
    state.tiledGenerationEnabled && usesTiledDiffusion ? <SelectPluginField key="tiled-diffusion-method" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.method" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.method.description" stateKey="tiledDiffusionMethod" options={comfyUiTiledDiffusionMethodOptions} /> : null,
    state.tiledGenerationEnabled && usesTiledDiffusion ? <NumberPluginField key="tiled-diffusion-overlap" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.overlap" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.overlap.description" stateKey="tiledDiffusionTileOverlap" min={0} max={2048} step={32} /> : null,
    state.tiledGenerationEnabled && usesTiledDiffusion ? <NumberPluginField key="tiled-diffusion-batch" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.batchSize" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.batchSize.description" stateKey="tiledDiffusionTileBatchSize" min={1} max={8192} step={1} /> : null,
    state.tiledGenerationEnabled && usesTiledDiffusion && state.tiledDiffusionMethod === 'SpotDiffusion' ? <SelectPluginField key="spot-shift-method" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.shiftMethod" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.shiftMethod.description" stateKey="tiledDiffusionShiftMethod" options={comfyUiSpotDiffusionShiftMethodOptions} /> : null,
    state.tiledGenerationEnabled && usesTiledDiffusion && state.tiledDiffusionMethod === 'SpotDiffusion' ? <NumberPluginField key="spot-shift-seed" context={context} labelKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.shiftSeed" descriptionKey="params.comfy.workflowPlugins.tiledGeneration.tiledDiffusion.shiftSeed.description" stateKey="tiledDiffusionShiftSeed" min={0} max={2147483647} step={1} /> : null,
    <ToggleField key="tiled-vae-encode-toggle" context={context} labelKey="params.comfy.workflowPlugins.tiledVaeEncode" descriptionKey="params.comfy.workflowPlugins.tiledVaeEncode.description" stateKey="tiledVaeEncodeEnabled" />,
    <ToggleField key="tiled-vae-decode-toggle" context={context} labelKey="params.comfy.workflowPlugins.tiledVaeDecode" descriptionKey="params.comfy.workflowPlugins.tiledVaeDecode.description" stateKey="tiledVaeDecodeEnabled" />,
    state.tiledVaeEncodeEnabled || state.tiledVaeDecodeEnabled ? <NumberPluginField key="tiled-vae-tile-size" context={context} labelKey="params.comfy.workflowPlugins.tiledVae.tileSize" descriptionKey="params.comfy.workflowPlugins.tiledVae.tileSize.description" stateKey="tiledVaeTileSize" min={64} max={4096} step={32} /> : null,
    state.tiledVaeEncodeEnabled || state.tiledVaeDecodeEnabled ? <NumberPluginField key="tiled-vae-overlap" context={context} labelKey="params.comfy.workflowPlugins.tiledVae.overlap" descriptionKey="params.comfy.workflowPlugins.tiledVae.overlap.description" stateKey="tiledVaeOverlap" min={0} max={4096} step={32} /> : null,
    <ToggleField key="pag-toggle" context={context} labelKey="params.comfy.workflowPlugins.pag" descriptionKey="params.comfy.workflowPlugins.pag.description" stateKey="pagEnabled" />,
    state.pagEnabled ? <NumberPluginField key="pag-scale" context={context} labelKey="params.comfy.workflowPlugins.pag.scale" descriptionKey="params.comfy.workflowPlugins.pag.scale.description" stateKey="pagScale" min={0} max={100} step={0.01} /> : null,
    <ToggleField key="perp-toggle" context={context} labelKey="params.comfy.workflowPlugins.perpGuider" descriptionKey="params.comfy.workflowPlugins.perpGuider.description" stateKey="perpGuiderEnabled" />,
    state.perpGuiderEnabled ? <NumberPluginField key="perp-scale" context={context} labelKey="params.comfy.workflowPlugins.perpGuider.scale" descriptionKey="params.comfy.workflowPlugins.perpGuider.scale.description" stateKey="perpGuiderScale" min={0} max={100} step={0.01} /> : null,
    state.perpGuiderEnabled ? <TextPluginField key="perp-blank" context={context} labelKey="params.comfy.workflowPlugins.perpGuider.blank" descriptionKey="params.comfy.workflowPlugins.perpGuider.blank.description" stateKey="perpGuiderBlankConditioning" /> : null,
    state.perpGuiderEnabled && state.tiledGenerationEnabled && usesBnk ? <ConflictWarning key="perp-tiled-warning" /> : null
  ].filter(Boolean);
}

export const comfyUiWorkflowPluginsGenerationExtension: ProviderGenerationExtension = {
  id: 'comfyui.extension.workflow-plugins.ui',
  order: 20,
  getTabStats: (context) => ({ service: pluginTabStat(context) }),
  renderSlot: renderWorkflowPluginsSlot
};
