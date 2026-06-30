import { useRef, useState, type PointerEvent } from 'react';
import {
  readComfyUiSettingsData,
  type ComfyUiLoraRegistration
} from '../../../domain/comfyUiSettings';
import { useI18n } from '../../../i18n';
import { PopoverSelect } from '../../../shared/ui';
import { ParamField } from '../support';
import type { ProviderGenerationSurfacePatchContext } from '../surfaceTypes';
import controls from '../ParamControls.module.css';
import workflowControls from './ComfyUiWorkflowControls.module.css';
import {
  readComfyUiParamState,
  type ComfyUiLoraSelection
} from './state';

function optionList(values: readonly string[], current: string) {
  const unique = [...new Set([current, ...values].filter(Boolean))];
  return unique.map((value) => ({ value, label: value }));
}

function buildLoraSelection(registration: ComfyUiLoraRegistration, current?: ComfyUiLoraSelection): ComfyUiLoraSelection {
  return {
    name: registration.loraName.trim(),
    strengthModel: current?.strengthModel ?? registration.defaultStrengthModel,
    strengthClip: current?.strengthClip ?? registration.defaultStrengthClip,
    enabled: true
  };
}

function moveLoraSelection(items: readonly ComfyUiLoraSelection[], sourceName: string, targetName: string): ComfyUiLoraSelection[] {
  const sourceIndex = items.findIndex((item) => item.name === sourceName);
  const targetIndex = items.findIndex((item) => item.name === targetName);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return [...items];
  const next = [...items];
  const [item] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, item);
  return next;
}

export function LoraStackField({ context }: { context: ProviderGenerationSurfacePatchContext }) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  const registrations = readComfyUiSettingsData(context.studioSettings ?? { adapterData: {} }).loras.filter((lora) => lora.loraName.trim());
  const registrationByName = new Map(registrations.map((registration) => [registration.loraName.trim(), registration] as const));
  const activeLoras = state.loras.filter((lora) => lora.enabled && lora.name.trim());
  const activeNames = new Set(activeLoras.map((lora) => lora.name));
  const availableRegistrations = registrations.filter((registration) => !activeNames.has(registration.loraName.trim()));
  const [addRegistrationId, setAddRegistrationId] = useState('');
  const [draggingName, setDraggingName] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const selectedRegistration = availableRegistrations.find((registration) => registration.id === addRegistrationId) ?? availableRegistrations[0] ?? null;
  const addOptions = availableRegistrations.map((registration) => ({
    value: registration.id,
    label: registration.displayName || registration.loraName,
    description: `${registration.loraName} · ${registration.defaultStrengthModel}/${registration.defaultStrengthClip}`
  }));

  const patchLoras = (next: ComfyUiLoraSelection[]) => context.patchProviderParam('loras', next);
  const clearLongPress = () => {
    if (longPressTimerRef.current === null) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };
  const replaceLora = (next: ComfyUiLoraSelection) => patchLoras(state.loras.map((lora) => lora.name === next.name ? next : lora));
  const addLora = () => {
    if (!selectedRegistration) return;
    const name = selectedRegistration.loraName.trim();
    const current = state.loras.find((lora) => lora.name === name);
    patchLoras([...state.loras.filter((lora) => lora.name !== name), buildLoraSelection(selectedRegistration, current)]);
  };
  const removeLora = (name: string) => patchLoras(state.loras.map((lora) => lora.name === name ? { ...lora, enabled: false } : lora));
  const patchStrength = (lora: ComfyUiLoraSelection, key: 'strengthModel' | 'strengthClip', value: number) => replaceLora({ ...lora, [key]: value });
  const moveLora = (sourceName: string, targetName: string) => patchLoras(moveLoraSelection(state.loras, sourceName, targetName));
  const stopPointerDrag = () => {
    clearLongPress();
    setDraggingName(null);
  };
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!draggingName || event.pointerType === 'mouse') return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-lora-stack-name]');
    const targetName = target?.dataset.loraStackName;
    if (targetName && targetName !== draggingName && activeNames.has(targetName)) moveLora(draggingName, targetName);
  };

  return (
    <div className={controls.fieldGridFull}>
      <ParamField label={t('params.comfy.loras')} description={t('params.comfy.loras.description')}>
        {registrations.length === 0 ? (
          <p className={controls.note}>{t('params.comfy.loras.empty')}</p>
        ) : (
          <div className={workflowControls.loraStack} data-testid="parameters-comfy-loras" onPointerMove={handlePointerMove} onPointerUp={stopPointerDrag} onPointerCancel={stopPointerDrag}>
            <div className={workflowControls.workflowBuilderAddRow}>
              <PopoverSelect
                value={selectedRegistration?.id ?? ''}
                onChange={(next) => setAddRegistrationId(String(next))}
                options={addOptions.length ? addOptions : [{ value: '', label: t('params.comfy.workflowPlugins.builder.noAvailable'), disabled: true }]}
                ariaLabel={t('params.comfy.loras')}
                className={controls.select}
                triggerClassName={controls.selectTrigger}
                panelClassName={controls.selectPanel}
                showSelectedDescription
              />
              <button type="button" className={workflowControls.workflowBuilderButton} onClick={addLora} disabled={!selectedRegistration}>{t('params.comfy.workflowPlugins.builder.add')}</button>
            </div>
            {activeLoras.length === 0 ? <p className={controls.note}>{t('params.comfy.loras.empty')}</p> : null}
            <div className={workflowControls.workflowBuilderList}>
              {activeLoras.map((lora, index) => {
                const registration = registrationByName.get(lora.name);
                return (
                  <details
                    key={lora.name}
                    className={workflowControls.workflowBuilderItem}
                    data-lora-stack-name={lora.name}
                    data-dragging={draggingName === lora.name ? 'true' : 'false'}
                    draggable
                    open
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', lora.name);
                      setDraggingName(lora.name);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceName = event.dataTransfer.getData('text/plain');
                      if (sourceName) moveLora(sourceName, lora.name);
                      setDraggingName(null);
                    }}
                    onDragEnd={() => setDraggingName(null)}
                    onPointerDown={(event) => {
                      if (event.pointerType === 'mouse') return;
                      clearLongPress();
                      longPressTimerRef.current = window.setTimeout(() => setDraggingName(lora.name), 360);
                    }}
                    onPointerUp={clearLongPress}
                    onPointerCancel={clearLongPress}
                  >
                    <summary className={workflowControls.workflowBuilderSummary}>
                      <span className={workflowControls.workflowBuilderHandle} aria-label={t('params.comfy.workflowPlugins.builder.drag')}>⋮⋮</span>
                      <span className={workflowControls.workflowBuilderStep}>{String(index + 1).padStart(2, '0')}</span>
                      <span className={workflowControls.workflowBuilderCopy}>
                        <strong>{registration?.displayName || lora.name}</strong>
                        <small>{lora.name} · {lora.strengthModel}/{lora.strengthClip}</small>
                      </span>
                      <button type="button" className={workflowControls.workflowBuilderRemove} onClick={(event) => { event.preventDefault(); event.stopPropagation(); removeLora(lora.name); }}>{t('params.comfy.workflowPlugins.builder.remove')}</button>
                    </summary>
                    <div className={workflowControls.workflowBuilderSettings}>
                      <div className={workflowControls.loraStrengthGrid}>
                        <label>
                          <span>{t('params.comfy.loras.strengthModel')}</span>
                          <input className={controls.input} type="number" min={-10} max={10} step={0.05} value={lora.strengthModel} onChange={(event) => patchStrength(lora, 'strengthModel', Number(event.target.value))} />
                        </label>
                        <label>
                          <span>{t('params.comfy.loras.strengthClip')}</span>
                          <input className={controls.input} type="number" min={-10} max={10} step={0.05} value={lora.strengthClip} onChange={(event) => patchStrength(lora, 'strengthClip', Number(event.target.value))} />
                        </label>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        )}
      </ParamField>
    </div>
  );
}
