import { useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import type { ProviderGenerationExtension } from '../../extensionTypes';
import type { ProviderGenerationSurfaceContext, ProviderGenerationSurfacePatchContext } from '../../surfaceTypes';
import type { GenerationParamSlot } from '../../types';
import { useI18n } from '../../../../i18n';
import { PopoverSelect } from '../../../../shared/ui';
import { ParamField } from '../../support';
import { LoraStackField } from '../ComfyUiSurfaceFields';
import controls from '../../ParamControls.module.css';
import {
  comfyUiSpotDiffusionShiftMethodOptions,
  comfyUiTiledDiffusionMethodOptions,
  comfyUiTiledGenerationBackendOptions,
  comfyUiTilingStrategyOptions,
  comfyUiWorkflowBuilderItemOptions,
  readComfyUiParamState,
  type ComfyUiParamState,
  type ComfyUiWorkflowBuilderItemKind
} from '../state';

function patchState(context: ProviderGenerationSurfacePatchContext, key: keyof ComfyUiParamState, value: unknown) {
  context.patchProviderParam(key, value);
}

function enabledCount(state: ComfyUiParamState): number {
  return state.workflowBuilder.length;
}

function pluginTabStat(context: ProviderGenerationSurfaceContext) {
  const state = readComfyUiParamState(context.params, context.provider);
  const count = enabledCount(state);
  return count ? `${count} step${count === 1 ? '' : 's'}` : 'base graph';
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

function InlineBooleanPluginField({ context, labelKey, descriptionKey, stateKey }: {
  context: ProviderGenerationSurfacePatchContext;
  labelKey: string;
  descriptionKey: string;
  stateKey: keyof ComfyUiParamState;
}) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  return (
    <ParamField label={t(labelKey)} description={t(descriptionKey)}>
      <label className={controls.inlineCheck}>
        <input type="checkbox" checked={Boolean(state[stateKey])} onChange={(event) => patchState(context, stateKey, event.target.checked)} />
        <span>{t('params.comfy.workflowPlugins.builder.subOption')}</span>
      </label>
    </ParamField>
  );
}

function ConflictWarning() {
  return <div className={controls.fieldGridFull}><div className={controls.warningStrip}><p>BNK_TiledKSampler and PerpNegGuider cannot run together. Switch Tiled Generation to ComfyUI_TiledDiffusion or remove one of them from the workflow builder.</p></div></div>;
}

type WorkflowPluginDefinition = {
  kind: ComfyUiWorkflowBuilderItemKind;
  labelKey: string;
  descriptionKey: string;
  getSummary: (state: ComfyUiParamState) => string;
  renderSettings: (context: ProviderGenerationSurfacePatchContext, state: ComfyUiParamState) => ReactNode[];
};

const workflowPluginDefinitions: WorkflowPluginDefinition[] = [
  {
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
  },
  {
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
  },
  {
    kind: 'pag',
    labelKey: 'params.comfy.workflowPlugins.pag',
    descriptionKey: 'params.comfy.workflowPlugins.pag.description',
    getSummary: (state) => `scale ${state.pagScale}`,
    renderSettings: (context) => [<NumberPluginField key="pag-scale" context={context} labelKey="params.comfy.workflowPlugins.pag.scale" descriptionKey="params.comfy.workflowPlugins.pag.scale.description" stateKey="pagScale" min={0} max={100} step={0.01} />]
  },
  {
    kind: 'freeuV2',
    labelKey: 'params.comfy.workflowPlugins.freeuV2',
    descriptionKey: 'params.comfy.workflowPlugins.freeuV2.description',
    getSummary: (state) => `b ${state.freeuV2B1}/${state.freeuV2B2} · s ${state.freeuV2S1}/${state.freeuV2S2}`,
    renderSettings: (context) => [
      <NumberPluginField key="freeu-v2-b1" context={context} labelKey="params.comfy.workflowPlugins.freeuV2.b1" descriptionKey="params.comfy.workflowPlugins.freeuV2.b1.description" stateKey="freeuV2B1" min={0} max={10} step={0.01} />,
      <NumberPluginField key="freeu-v2-b2" context={context} labelKey="params.comfy.workflowPlugins.freeuV2.b2" descriptionKey="params.comfy.workflowPlugins.freeuV2.b2.description" stateKey="freeuV2B2" min={0} max={10} step={0.01} />,
      <NumberPluginField key="freeu-v2-s1" context={context} labelKey="params.comfy.workflowPlugins.freeuV2.s1" descriptionKey="params.comfy.workflowPlugins.freeuV2.s1.description" stateKey="freeuV2S1" min={0} max={10} step={0.01} />,
      <NumberPluginField key="freeu-v2-s2" context={context} labelKey="params.comfy.workflowPlugins.freeuV2.s2" descriptionKey="params.comfy.workflowPlugins.freeuV2.s2.description" stateKey="freeuV2S2" min={0} max={10} step={0.01} />
    ]
  },
  {
    kind: 'perpGuider',
    labelKey: 'params.comfy.workflowPlugins.perpGuider',
    descriptionKey: 'params.comfy.workflowPlugins.perpGuider.description',
    getSummary: (state) => `neg scale ${state.perpGuiderScale}`,
    renderSettings: (context) => [
      <NumberPluginField key="perp-scale" context={context} labelKey="params.comfy.workflowPlugins.perpGuider.scale" descriptionKey="params.comfy.workflowPlugins.perpGuider.scale.description" stateKey="perpGuiderScale" min={0} max={100} step={0.01} />,
      <TextPluginField key="perp-blank" context={context} labelKey="params.comfy.workflowPlugins.perpGuider.blank" descriptionKey="params.comfy.workflowPlugins.perpGuider.blank.description" stateKey="perpGuiderBlankConditioning" />
    ]
  },
  {
    kind: 'loraStack',
    labelKey: 'params.comfy.workflowPlugins.loraStack',
    descriptionKey: 'params.comfy.workflowPlugins.loraStack.description',
    getSummary: (state) => `${state.loras.filter((lora) => lora.enabled && lora.name.trim()).length} LoRA`,
    renderSettings: (context) => [<LoraStackField key="lora-stack-field" context={context} />]
  }
];

const definitionsByKind = new Map(workflowPluginDefinitions.map((definition) => [definition.kind, definition]));

function syncWorkflowBuilder(context: ProviderGenerationSurfacePatchContext, state: ComfyUiParamState, nextBuilder: ComfyUiWorkflowBuilderItemKind[]) {
  const has = (kind: ComfyUiWorkflowBuilderItemKind) => nextBuilder.includes(kind);
  context.setProviderParams({
    ...state,
    workflowBuilder: nextBuilder,
    tiledGenerationEnabled: has('tiledGeneration'),
    pagEnabled: has('pag'),
    freeuV2Enabled: has('freeuV2'),
    perpGuiderEnabled: has('perpGuider'),
    tiledVaeEncodeEnabled: has('tiledVae') && (state.tiledVaeEncodeEnabled || (!state.tiledVaeEncodeEnabled && !state.tiledVaeDecodeEnabled)),
    tiledVaeDecodeEnabled: has('tiledVae') && (state.tiledVaeDecodeEnabled || (!state.tiledVaeEncodeEnabled && !state.tiledVaeDecodeEnabled))
  });
}

function moveWorkflowBuilderItem(items: readonly ComfyUiWorkflowBuilderItemKind[], sourceKind: ComfyUiWorkflowBuilderItemKind, targetKind: ComfyUiWorkflowBuilderItemKind): ComfyUiWorkflowBuilderItemKind[] {
  const sourceIndex = items.indexOf(sourceKind);
  const targetIndex = items.indexOf(targetKind);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return [...items];
  const next = [...items];
  const [item] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

function WorkflowBuilder({ context }: { context: ProviderGenerationSurfacePatchContext }) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  const [addKind, setAddKind] = useState<ComfyUiWorkflowBuilderItemKind>('tiledGeneration');
  const [draggingKind, setDraggingKind] = useState<ComfyUiWorkflowBuilderItemKind | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const builderSet = new Set(state.workflowBuilder);
  const available = comfyUiWorkflowBuilderItemOptions.filter((kind) => !builderSet.has(kind));
  const selectedAddKind = available.includes(addKind) ? addKind : available[0] ?? 'tiledGeneration';
  const addOptions = available.map((kind) => {
    const definition = definitionsByKind.get(kind)!;
    return { value: kind, label: t(definition.labelKey), description: t(definition.descriptionKey) };
  });

  const clearLongPress = () => {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const applyBuilder = (next: ComfyUiWorkflowBuilderItemKind[]) => syncWorkflowBuilder(context, state, next);
  const addPlugin = () => {
    if (!available.includes(selectedAddKind)) return;
    applyBuilder([...state.workflowBuilder, selectedAddKind]);
  };
  const removePlugin = (kind: ComfyUiWorkflowBuilderItemKind) => applyBuilder(state.workflowBuilder.filter((item) => item !== kind));
  const movePlugin = (sourceKind: ComfyUiWorkflowBuilderItemKind, targetKind: ComfyUiWorkflowBuilderItemKind) => applyBuilder(moveWorkflowBuilderItem(state.workflowBuilder, sourceKind, targetKind));

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!draggingKind || event.pointerType === 'mouse') return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-workflow-builder-kind]');
    const targetKind = target?.dataset.workflowBuilderKind as ComfyUiWorkflowBuilderItemKind | undefined;
    if (targetKind && targetKind !== draggingKind && builderSet.has(targetKind)) movePlugin(draggingKind, targetKind);
  };

  const stopPointerDrag = () => {
    clearLongPress();
    setDraggingKind(null);
  };

  const hasConflict = state.workflowBuilder.includes('perpGuider') && state.workflowBuilder.includes('tiledGeneration') && state.tiledGenerationBackend === 'bnkTiledKSampler';

  return (
    <div className={controls.workflowBuilder} onPointerMove={handlePointerMove} onPointerUp={stopPointerDrag} onPointerCancel={stopPointerDrag}>
      <div className={controls.workflowBuilderIntro}>
        <div>
          <strong>{t('params.comfy.workflowPlugins.builder')}</strong>
          <p>{t('params.comfy.workflowPlugins.builder.description')}</p>
        </div>
      </div>
      <div className={controls.workflowBuilderAddRow}>
        <PopoverSelect
          value={selectedAddKind}
          onChange={(next) => setAddKind(next as ComfyUiWorkflowBuilderItemKind)}
          options={addOptions.length ? addOptions : [{ value: selectedAddKind, label: t('params.comfy.workflowPlugins.builder.noAvailable'), disabled: true }]}
          ariaLabel={t('params.comfy.workflowPlugins.builder.add')}
          className={controls.select}
          triggerClassName={controls.selectTrigger}
          panelClassName={controls.selectPanel}
          showSelectedDescription
        />
        <button type="button" className={controls.workflowBuilderButton} onClick={addPlugin} disabled={!available.length}>{t('params.comfy.workflowPlugins.builder.add')}</button>
      </div>
      {state.workflowBuilder.length === 0 ? <p className={controls.note}>{t('params.comfy.workflowPlugins.builder.empty')}</p> : null}
      <div className={controls.workflowBuilderList}>
        {state.workflowBuilder.map((kind, index) => {
          const definition = definitionsByKind.get(kind);
          if (!definition) return null;
          return (
            <details
              key={kind}
              className={controls.workflowBuilderItem}
              data-workflow-builder-kind={kind}
              data-dragging={draggingKind === kind ? 'true' : 'false'}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', kind);
                setDraggingKind(kind);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const sourceKind = event.dataTransfer.getData('text/plain') as ComfyUiWorkflowBuilderItemKind;
                if (sourceKind) movePlugin(sourceKind, kind);
                setDraggingKind(null);
              }}
              onDragEnd={() => setDraggingKind(null)}
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse') return;
                clearLongPress();
                longPressTimerRef.current = window.setTimeout(() => setDraggingKind(kind), 360);
              }}
              onPointerUp={clearLongPress}
              onPointerCancel={clearLongPress}
            >
              <summary className={controls.workflowBuilderSummary}>
                <span className={controls.workflowBuilderHandle} aria-label={t('params.comfy.workflowPlugins.builder.drag')}>⋮⋮</span>
                <span className={controls.workflowBuilderStep}>{String(index + 1).padStart(2, '0')}</span>
                <span className={controls.workflowBuilderCopy}>
                  <strong>{t(definition.labelKey)}</strong>
                  <small>{definition.getSummary(state)}</small>
                </span>
                <button type="button" className={controls.workflowBuilderRemove} onClick={(event) => { event.preventDefault(); event.stopPropagation(); removePlugin(kind); }}>{t('params.comfy.workflowPlugins.builder.remove')}</button>
              </summary>
              <div className={controls.workflowBuilderSettings}>
                {definition.renderSettings(context, state)}
              </div>
            </details>
          );
        })}
      </div>
      {hasConflict ? <ConflictWarning /> : null}
    </div>
  );
}

function renderWorkflowPluginsSlot(slot: GenerationParamSlot, context: ProviderGenerationSurfacePatchContext) {
  if (slot !== 'composer/parameters/service') return [];
  return [<WorkflowBuilder key="workflow-builder" context={context} />];
}

export const comfyUiWorkflowPluginsGenerationExtension: ProviderGenerationExtension = {
  id: 'comfyui.extension.workflow-plugins.ui',
  order: 20,
  getTabStats: (context) => ({ service: pluginTabStat(context) }),
  renderSlot: renderWorkflowPluginsSlot
};
