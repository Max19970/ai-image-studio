import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { ProviderGenerationExtension } from '../../extensionTypes';
import type { ProviderGenerationSurfaceContext, ProviderGenerationSurfacePatchContext } from '../../surfaceTypes';
import type { GenerationParamSlot } from '../../types';
import { useI18n } from '../../../../i18n';
import { PopoverSelect } from '../../../../shared/ui';
import controls from '../../ParamControls.module.css';
import workflowControls from '../ComfyUiWorkflowControls.module.css';
import { ConflictWarning } from './workflowPluginFields';
import {
  readComfyUiParamState,
  type ComfyUiParamState,
  type ComfyUiWorkflowBuilderItemKind
} from '../state';
import { workflowPluginDefinitions, workflowPluginDefinitionsByKind } from './plugins';

function enabledCount(state: ComfyUiParamState): number {
  return state.workflowBuilder.length;
}

function pluginTabStat(context: ProviderGenerationSurfaceContext) {
  const state = readComfyUiParamState(context.params, context.provider);
  const count = enabledCount(state);
  return count ? `${count} step${count === 1 ? '' : 's'}` : 'base graph';
}

function syncWorkflowBuilder(context: ProviderGenerationSurfacePatchContext, state: ComfyUiParamState, nextBuilder: ComfyUiWorkflowBuilderItemKind[]) {
  const builderSet = new Set(nextBuilder);
  const pluginStatePatch = Object.fromEntries(
    workflowPluginDefinitions.flatMap((definition) => {
      const patch = definition.enableInState?.(state, builderSet.has(definition.kind));
      return patch ? Object.entries(patch) : [];
    })
  );
  context.setProviderParams({
    ...state,
    ...pluginStatePatch,
    workflowBuilder: nextBuilder
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
  const [addKind, setAddKind] = useState<ComfyUiWorkflowBuilderItemKind>(() => workflowPluginDefinitions[0]?.kind ?? '');
  const [draggingKind, setDraggingKind] = useState<ComfyUiWorkflowBuilderItemKind | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const builderSet = new Set(state.workflowBuilder);
  const available = workflowPluginDefinitions.map((definition) => definition.kind).filter((kind) => !builderSet.has(kind));
  const selectedAddKind = available.includes(addKind) ? addKind : available[0] ?? '';
  const addOptions = available.map((kind) => {
    const definition = workflowPluginDefinitionsByKind.get(kind)!;
    return { value: kind, label: t(definition.labelKey), description: t(definition.descriptionKey) };
  });

  const clearLongPress = () => {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const applyBuilder = (next: ComfyUiWorkflowBuilderItemKind[]) => syncWorkflowBuilder(context, state, next);
  const addPlugin = () => {
    if (!selectedAddKind || !available.includes(selectedAddKind)) return;
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
    <div className={workflowControls.workflowBuilder} onPointerMove={handlePointerMove} onPointerUp={stopPointerDrag} onPointerCancel={stopPointerDrag}>
      <div className={workflowControls.workflowBuilderIntro}>
        <div>
          <strong>{t('params.comfy.workflowPlugins.builder')}</strong>
          <p>{t('params.comfy.workflowPlugins.builder.description')}</p>
        </div>
      </div>
      <div className={workflowControls.workflowBuilderAddRow}>
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
        <button type="button" className={workflowControls.workflowBuilderButton} onClick={addPlugin} disabled={!available.length}>{t('params.comfy.workflowPlugins.builder.add')}</button>
      </div>
      {state.workflowBuilder.length === 0 ? <p className={controls.note}>{t('params.comfy.workflowPlugins.builder.empty')}</p> : null}
      <div className={workflowControls.workflowBuilderList}>
        {state.workflowBuilder.map((kind, index) => {
          const definition = workflowPluginDefinitionsByKind.get(kind);
          if (!definition) return null;
          return (
            <details
              key={kind}
              className={workflowControls.workflowBuilderItem}
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
              <summary className={workflowControls.workflowBuilderSummary}>
                <span className={workflowControls.workflowBuilderHandle} aria-label={t('params.comfy.workflowPlugins.builder.drag')}>⋮⋮</span>
                <span className={workflowControls.workflowBuilderStep}>{String(index + 1).padStart(2, '0')}</span>
                <span className={workflowControls.workflowBuilderCopy}>
                  <strong>{t(definition.labelKey)}</strong>
                  <small>{definition.getSummary(state)}</small>
                </span>
                <button type="button" className={workflowControls.workflowBuilderRemove} onClick={(event) => { event.preventDefault(); event.stopPropagation(); removePlugin(kind); }}>{t('params.comfy.workflowPlugins.builder.remove')}</button>
              </summary>
              <div className={workflowControls.workflowBuilderSettings}>
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
