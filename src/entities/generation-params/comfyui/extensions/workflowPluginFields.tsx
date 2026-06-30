import { useI18n } from '../../../../i18n';
import { PopoverSelect } from '../../../../shared/ui';
import { ParamField } from '../../support';
import type { ProviderGenerationSurfacePatchContext } from '../../surfaceTypes';
import controls from '../../ParamControls.module.css';
import {
  readComfyUiParamState,
  type ComfyUiParamState
} from '../state';

function patchState(context: ProviderGenerationSurfacePatchContext, key: keyof ComfyUiParamState, value: unknown) {
  context.patchProviderParam(key, value);
}

export function NumberPluginField({ context, labelKey, descriptionKey, stateKey, min, max, step = 1 }: {
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

export function TextPluginField({ context, labelKey, descriptionKey, stateKey }: {
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

export function SelectPluginField<TValue extends string>({ context, labelKey, descriptionKey, stateKey, options }: {
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

export function InlineBooleanPluginField({ context, labelKey, descriptionKey, stateKey }: {
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

export function ConflictWarning() {
  return <div className={controls.fieldGridFull}><div className={controls.warningStrip}><p>BNK_TiledKSampler and PerpNegGuider cannot run together. Switch Tiled Generation to ComfyUI_TiledDiffusion or remove one of them from the workflow builder.</p></div></div>;
}
