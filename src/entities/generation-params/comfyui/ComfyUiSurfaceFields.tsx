import { useEffect, useMemo, useState } from 'react';
import {
  cacheKeyForComfyUiResources,
  readComfyUiSettingsData,
  type ComfyUiLoraRegistration
} from '../../../domain/comfyUiSettings';
import { useI18n } from '../../../i18n';
import { PopoverSelect } from '../../../shared/ui';
import { getModeImageSizeConstraint } from '../../provider/valueConstraints';
import { ParamField, ParamInfoTip } from '../support';
import { DraftNumberInput } from '../fields/shared/DraftNumberInput';
import type { ProviderGenerationSurfacePatchContext } from '../surfaceTypes';
import controls from '../ParamControls.module.css';
import {
  COMFYUI_MAX_SEED,
  comfyUiSamplerOptions,
  comfyUiSchedulerOptions,
  readComfyUiParamState,
  type ComfyUiLoraSelection,
  type ComfyUiParamState
} from './state';

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

export function NumberField({ context, labelKey, descriptionKey, stateKey, min, max, step = 1 }: {
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
  const isSizeField = stateKey === 'width' || stateKey === 'height';
  const sizeConstraint = getModeImageSizeConstraint(context.providerMode);
  const sizeRulesText = t(sizeConstraint.infoKey ?? 'params.sizeRules.generic', {
    min: sizeConstraint.min,
    max: sizeConstraint.max,
    multiple: sizeConstraint.multipleOf ?? 1,
    snap: t(sizeConstraint.snap === 'ceil' ? 'params.sizeRules.snap.ceil' : sizeConstraint.snap === 'round' ? 'params.sizeRules.snap.round' : 'params.sizeRules.snap.floor')
  });
  return (
    <ParamField label={t(labelKey)} description={t(descriptionKey)} toggle={isSizeField ? <ParamInfoTip ariaLabel={t('params.sizeRules.infoButton')} text={sizeRulesText} /> : undefined}>
      {isSizeField ? (
        <DraftNumberInput
          ariaLabel={t(labelKey)}
          className={controls.input}
          step={step}
          value={numberValue(state[stateKey])}
          onChange={(value) => patchState(context, stateKey, value)}
        />
      ) : (
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
      )}
    </ParamField>
  );
}

export function TextField({ context, labelKey, descriptionKey, stateKey, multiline = false }: {
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

export function SelectField({ context, labelKey, descriptionKey, stateKey, options }: {
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

export function SeedModeField({ context }: { context: ProviderGenerationSurfacePatchContext }) {
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

export function HiresScaleField({ context }: { context: ProviderGenerationSurfacePatchContext }) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  const hasSourceSize = state.hiresInputWidth > 0 && state.hiresInputHeight > 0;
  const note = hasSourceSize
    ? t('params.comfy.hiresScale.sourceKnown', { width: state.hiresInputWidth, height: state.hiresInputHeight })
    : t('params.comfy.hiresScale.sourceUnknown');
  return (
    <ParamField label={t('params.comfy.hiresScale')} description={t('params.comfy.hiresScale.description')}>
      <input
        aria-label={t('params.comfy.hiresScale')}
        className={controls.input}
        type="number"
        min={0.1}
        max={8}
        step={0.01}
        value={numberValue(state.hiresScale)}
        onChange={(event) => patchState(context, 'hiresScale', Number(event.target.value))}
      />
      <p className={controls.note}>{note}</p>
    </ParamField>
  );
}

export function HiresUpscaleModeField({ context }: { context: ProviderGenerationSurfacePatchContext }) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  return (
    <ParamField label={t('params.comfy.hiresUpscaleMode')} description={t('params.comfy.hiresUpscaleMode.description')}>
      <PopoverSelect
        value={state.hiresUpscaleMode}
        onChange={(next) => patchState(context, 'hiresUpscaleMode', next)}
        options={[
          { value: 'latent', label: t('params.comfy.hiresUpscaleMode.latent'), description: t('params.comfy.hiresUpscaleMode.latent.description') },
          { value: 'ai', label: t('params.comfy.hiresUpscaleMode.ai'), description: t('params.comfy.hiresUpscaleMode.ai.description') }
        ]}
        ariaLabel={t('params.comfy.hiresUpscaleMode')}
        className={controls.select}
        triggerClassName={controls.selectTrigger}
        panelClassName={controls.selectPanel}
        showSelectedDescription
      />
    </ParamField>
  );
}

function getCachedUpscaleModels(context: ProviderGenerationSurfacePatchContext): string[] {
  const settings = context.studioSettings;
  if (!settings) return [];
  const data = readComfyUiSettingsData(settings);
  const provider = settings.providers.find((item) => (
    item.adapterId === context.provider.adapterId
    && item.generationEndpoint === context.provider.generationEndpoint
  )) ?? settings.providers.find((item) => item.adapterId === 'comfyui') ?? null;
  if (!provider) return [];
  const cache = data.resourceCache[cacheKeyForComfyUiResources(provider.id, 'upscale_models')];
  return cache?.items.map((item) => item.name || item.id).filter(Boolean) ?? [];
}

export function HiresUpscaleModelField({ context }: { context: ProviderGenerationSurfacePatchContext }) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  const cachedModels = getCachedUpscaleModels(context);
  const defaultModel = cachedModels[0] || '';
  const value = state.hiresUpscaleModel || defaultModel;

  useEffect(() => {
    if (state.hiresUpscaleModel || !defaultModel) return;
    patchState(context, 'hiresUpscaleModel', defaultModel);
  }, [context, defaultModel, state.hiresUpscaleModel]);

  const options = value
    ? optionList(cachedModels, value)
    : [{ value: '', label: t('params.comfy.hiresUpscaleModel.empty'), disabled: true }];
  return (
    <ParamField label={t('params.comfy.hiresUpscaleModel')} description={t('params.comfy.hiresUpscaleModel.description')}>
      <PopoverSelect
        value={value}
        onChange={(next) => patchState(context, 'hiresUpscaleModel', next)}
        options={options}
        ariaLabel={t('params.comfy.hiresUpscaleModel')}
        placeholder={t('params.comfy.hiresUpscaleModel.empty')}
        emptyText={t('params.comfy.hiresUpscaleModel.empty')}
        className={controls.select}
        triggerClassName={controls.selectTrigger}
        panelClassName={controls.selectPanel}
      />
      {cachedModels.length === 0 ? (
        <p className={controls.note}>{t('params.comfy.hiresUpscaleModel.cacheHint')}</p>
      ) : null}
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

export function LoraStackField({ context }: { context: ProviderGenerationSurfacePatchContext }) {
  const { t } = useI18n();
  const state = readComfyUiParamState(context.params, context.provider);
  const registrations = readComfyUiSettingsData(context.studioSettings ?? { adapterData: {} }).loras.filter((lora) => lora.loraName.trim());
  const [search, setSearch] = useState('');
  const visibleRegistrations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return registrations;
    return registrations.filter((registration) => [registration.displayName, registration.loraName, registration.notes].join('\n').toLowerCase().includes(query));
  }, [registrations, search]);
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
            <input
              className={controls.loraSearch}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('params.comfy.loras.search')}
              aria-label={t('params.comfy.loras.search')}
            />
            {visibleRegistrations.length === 0 ? <p className={controls.note}>{t('params.comfy.loras.noMatches')}</p> : null}
            {visibleRegistrations.map((registration) => {
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

export { comfyUiSamplerOptions, comfyUiSchedulerOptions, COMFYUI_MAX_SEED };
