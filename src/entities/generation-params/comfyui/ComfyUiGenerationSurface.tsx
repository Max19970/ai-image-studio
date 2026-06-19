import { PopoverSelect } from '../../../shared/ui';
import { readComfyUiSettingsData, type ComfyUiLoraRegistration } from '../../../domain/comfyUiSettings';
import { useI18n } from '../../../i18n';
import { normalizeImageParamsFromDefinitions } from '../logicalRegistry';
import { renderGenerationParamSlot } from '../registry';
import { ParamField } from '../support';
import type { GenerationParamSlot, GenerationParamTab, GenerationParamTabDefinition } from '../types';
import type { ProviderGenerationSurface, ProviderGenerationSurfaceContext, ProviderGenerationSurfacePatchContext } from '../surfaceTypes';
import controls from '../ParamControls.module.css';
import {
  COMFYUI_SURFACE_ID,
  COMFYUI_MAX_SEED,
  buildComfyUiPayload,
  comfyUiSamplerOptions,
  comfyUiSchedulerOptions,
  createComfyUiParameterSummary,
  defaultComfyUiParamState,
  normalizeComfyUiParamState,
  readComfyUiParamState,
  toComfyUiProviderParamState,
  type ComfyUiLoraSelection,
  type ComfyUiParamState
} from './state';
import { comfyUiGenerationRequestSurface } from './requestSurface';

const comfyUiTabs: readonly GenerationParamTabDefinition[] = [
  { id: 'frame', slot: 'composer/parameters/frame', labelKey: 'params.comfy.frame', hintKey: 'params.comfy.frameHint' },
  { id: 'render', slot: 'composer/parameters/render', labelKey: 'params.comfy.sampling', hintKey: 'params.comfy.samplingHint' },
  { id: 'service', slot: 'composer/parameters/service', labelKey: 'params.comfy.workflow', hintKey: 'params.comfy.workflowHint' },
  { id: 'retry', slot: 'composer/parameters/retry', labelKey: 'params.retry', hintKey: 'params.retryHint', panelClassKey: 'retryTabPanel' }
];

function optionList(values: readonly string[], current: string) {
  const unique = [...new Set([current, ...values].filter(Boolean))];
  return unique.map((value) => ({ value, label: value }));
}

function numberValue(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function patchState(context: ProviderGenerationSurfacePatchContext, key: keyof ComfyUiParamState, value: unknown) {
  context.patchProviderParam(key, value);
}

function NumberField({ context, labelKey, descriptionKey, stateKey, min, max, step = 1 }: {
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
      <input
        aria-label={t(labelKey)}
        className={controls.input}
        type="number"
        min={min}
        max={max}
        step={step}
        value={numberValue(state[stateKey])}
        onChange={(event) => patchState(context, stateKey, Number(event.target.value))}
      />
    </ParamField>
  );
}

function TextField({ context, labelKey, descriptionKey, stateKey, multiline = false }: {
  context: ProviderGenerationSurfacePatchContext;
  labelKey: string;
  descriptionKey: string;
  stateKey: keyof ComfyUiParamState;
  multiline?: boolean;
}) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  const value = String(state[stateKey] ?? '');
  return (
    <ParamField label={t(labelKey)} description={t(descriptionKey)}>
      {multiline ? (
        <textarea
          aria-label={t(labelKey)}
          className={`${controls.input} ${controls.textareaTall}`}
          value={value}
          onChange={(event) => patchState(context, stateKey, event.target.value)}
        />
      ) : (
        <input
          aria-label={t(labelKey)}
          className={controls.input}
          type="text"
          value={value}
          onChange={(event) => patchState(context, stateKey, event.target.value)}
        />
      )}
    </ParamField>
  );
}

function SelectField({ context, labelKey, descriptionKey, stateKey, options }: {
  context: ProviderGenerationSurfacePatchContext;
  labelKey: string;
  descriptionKey: string;
  stateKey: keyof ComfyUiParamState;
  options: readonly string[];
}) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  const value = String(state[stateKey] ?? '');
  return (
    <ParamField label={t(labelKey)} description={t(descriptionKey)}>
      <PopoverSelect
        value={value}
        onChange={(next) => patchState(context, stateKey, next)}
        options={optionList(options, value)}
        ariaLabel={t(labelKey)}
        className={controls.select}
        triggerClassName={controls.selectTrigger}
        panelClassName={controls.selectPanel}
      />
    </ParamField>
  );
}

function SeedModeField({ context }: { context: ProviderGenerationSurfacePatchContext }) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  return (
    <ParamField label={t('params.comfy.seedMode')} description={t('params.comfy.seedMode.description')}>
      <PopoverSelect
        value={state.seedMode}
        onChange={(next) => patchState(context, 'seedMode', next)}
        options={[
          { value: 'random', label: t('params.comfy.seedMode.random') },
          { value: 'fixed', label: t('params.comfy.seedMode.fixed') }
        ]}
        ariaLabel={t('params.comfy.seedMode')}
        className={controls.select}
        triggerClassName={controls.selectTrigger}
        panelClassName={controls.selectPanel}
      />
    </ParamField>
  );
}

function buildLoraSelection(registration: ComfyUiLoraRegistration, current?: ComfyUiLoraSelection): ComfyUiLoraSelection {
  return {
    name: registration.loraName.trim(),
    strengthModel: current?.strengthModel ?? registration.defaultStrengthModel,
    strengthClip: current?.strengthClip ?? registration.defaultStrengthClip,
    enabled: true
  };
}

function LoraStackField({ context }: { context: ProviderGenerationSurfacePatchContext }) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  const registrations = readComfyUiSettingsData(context.studioSettings ?? { adapterData: {} }).loras.filter((lora) => lora.loraName.trim());
  const activeByName = new Map(state.loras.map((lora) => [lora.name, lora] as const));

  const patchLoras = (next: ComfyUiLoraSelection[]) => patchState(context, 'loras', next);
  const withoutLora = (name: string) => state.loras.filter((lora) => lora.name !== name);

  const toggleLora = (registration: ComfyUiLoraRegistration, enabled: boolean) => {
    const name = registration.loraName.trim();
    const current = activeByName.get(name);
    patchLoras(enabled ? [...withoutLora(name), buildLoraSelection(registration, current)] : withoutLora(name));
  };

  const patchStrength = (registration: ComfyUiLoraRegistration, key: 'strengthModel' | 'strengthClip', value: number) => {
    const name = registration.loraName.trim();
    const current = activeByName.get(name);
    patchLoras([...withoutLora(name), { ...buildLoraSelection(registration, current), [key]: value }]);
  };

  return (
    <div className={controls.fieldGridFull}>
      <ParamField label={t('params.comfy.loras')} description={t('params.comfy.loras.description')}>
        {registrations.length === 0 ? (
          <p className={controls.note}>{t('params.comfy.loras.empty')}</p>
        ) : (
          <div className={controls.loraStack} data-testid="parameters-comfy-loras">
            {registrations.map((registration) => {
              const name = registration.loraName.trim();
              const current = activeByName.get(name);
              const enabled = Boolean(current?.enabled);
              return (
                <div key={registration.id} className={controls.loraRow} data-active={enabled ? 'true' : 'false'}>
                  <label className={controls.loraToggle}>
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => toggleLora(registration, event.target.checked)}
                    />
                    <span>
                      <strong>{registration.displayName || name}</strong>
                      <small>{name}</small>
                    </span>
                  </label>
                  <div className={controls.loraStrengthGrid}>
                    <label>
                      <span>{t('params.comfy.loras.strengthModel')}</span>
                      <input
                        className={controls.input}
                        type="number"
                        min={-10}
                        max={10}
                        step={0.05}
                        value={current?.strengthModel ?? registration.defaultStrengthModel}
                        disabled={!enabled}
                        onChange={(event) => patchStrength(registration, 'strengthModel', Number(event.target.value))}
                      />
                    </label>
                    <label>
                      <span>{t('params.comfy.loras.strengthClip')}</span>
                      <input
                        className={controls.input}
                        type="number"
                        min={-10}
                        max={10}
                        step={0.05}
                        value={current?.strengthClip ?? registration.defaultStrengthClip}
                        disabled={!enabled}
                        onChange={(event) => patchStrength(registration, 'strengthClip', Number(event.target.value))}
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ParamField>
    </div>
  );
}


function renderComfyUiSlot(slot: GenerationParamSlot, context: ProviderGenerationSurfacePatchContext) {
  const state = readComfyUiParamState(context.params, context.provider);
  if (slot === 'composer/parameters/frame') {
    return [
      <NumberField key="width" context={context} labelKey="params.comfy.width" descriptionKey="params.comfy.width.description" stateKey="width" min={64} max={4096} step={16} />,
      <NumberField key="height" context={context} labelKey="params.comfy.height" descriptionKey="params.comfy.height.description" stateKey="height" min={64} max={4096} step={16} />,
      <NumberField key="batchSize" context={context} labelKey="params.comfy.batchSize" descriptionKey="params.comfy.batchSize.description" stateKey="batchSize" min={1} max={16} step={1} />
    ];
  }
  if (slot === 'composer/parameters/render') {
    return [
      <NumberField key="steps" context={context} labelKey="params.comfy.steps" descriptionKey="params.comfy.steps.description" stateKey="steps" min={1} max={150} step={1} />,
      <NumberField key="cfg" context={context} labelKey="params.comfy.cfg" descriptionKey="params.comfy.cfg.description" stateKey="cfg" min={0} max={30} step={0.1} />,
      <SelectField key="sampler" context={context} labelKey="params.comfy.sampler" descriptionKey="params.comfy.sampler.description" stateKey="samplerName" options={comfyUiSamplerOptions} />,
      <SelectField key="scheduler" context={context} labelKey="params.comfy.scheduler" descriptionKey="params.comfy.scheduler.description" stateKey="scheduler" options={comfyUiSchedulerOptions} />,
      <SeedModeField key="seedMode" context={context} />,
      state.seedMode === 'fixed' ? <NumberField key="seed" context={context} labelKey="params.comfy.seed" descriptionKey="params.comfy.seed.description" stateKey="seed" min={0} max={COMFYUI_MAX_SEED} step={1} /> : null,
      <NumberField key="denoise" context={context} labelKey="params.comfy.denoise" descriptionKey="params.comfy.denoise.description" stateKey="denoise" min={0} max={1} step={0.01} />
    ].filter(Boolean);
  }
  if (slot === 'composer/parameters/service') {
    return [
      <TextField key="negative" context={context} labelKey="params.comfy.negativePrompt" descriptionKey="params.comfy.negativePrompt.description" stateKey="negativePrompt" multiline />,
      <TextField key="filename" context={context} labelKey="params.comfy.filenamePrefix" descriptionKey="params.comfy.filenamePrefix.description" stateKey="filenamePrefix" />,
      <LoraStackField key="loras" context={context} />
    ];
  }
  if (slot === 'composer/parameters/retry') return renderGenerationParamSlot(slot, context);
  return [];
}

function tabStats(context: ProviderGenerationSurfaceContext, retryOffLabel: string): Record<GenerationParamTab, string> {
  const state = readComfyUiParamState(context.params, context.provider);
  return {
    frame: `${state.width}×${state.height} · ${state.batchSize}x`,
    render: `${state.steps} steps · CFG ${state.cfg}`,
    output: 'workflow',
    service: state.loras.filter((lora) => lora.enabled).length ? `${state.loras.filter((lora) => lora.enabled).length} LoRA` : 'no LoRA',
    retry: context.params.retryAttempts > 0 ? `${context.params.retryAttempts}× / ${context.params.retryDelaySeconds}s` : retryOffLabel
  };
}

export const comfyUiGenerationSurface: ProviderGenerationSurface = {
  id: COMFYUI_SURFACE_ID,
  kind: 'provider-owned',
  getDefaultState: () => toComfyUiProviderParamState(defaultComfyUiParamState),
  getStateKey: () => 'comfyui',
  readState: (params, provider) => toComfyUiProviderParamState(readComfyUiParamState(params, provider)),
  normalizeState: (value) => toComfyUiProviderParamState(normalizeComfyUiParamState(value)),
  normalizeParams: normalizeImageParamsFromDefinitions,
  getTabs: () => comfyUiTabs,
  getInitialTab: () => 'frame',
  getTabStats: (context, labels) => tabStats(context, labels?.retryOff ?? 'off'),
  getHiddenSummary: () => ({ capabilityKeys: [], paramLabelKeys: [] }),
  renderSlot: renderComfyUiSlot,
  buildPayload: ({ params, provider }) => buildComfyUiPayload(params, provider),
  captureParamsSnapshot: (context) => comfyUiGenerationRequestSurface.captureParamsSnapshot(context),
  captureProviderParamsSnapshot: (context) => comfyUiGenerationRequestSurface.captureProviderParamsSnapshot(context),
  captureParameterSummary: (context) => createComfyUiParameterSummary(readComfyUiParamState(context.params, context.provider), context.provider),
  restoreParamsFromSnapshot: (context) => comfyUiGenerationRequestSurface.restoreParamsFromSnapshot(context)
};
