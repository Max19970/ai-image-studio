import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { defaultGenerationProvider } from '../../../../domain/defaults';
import type { GenerationModel, GenerationProvider } from '../../../../domain/providerSettings';
import type { ProviderProbeReport, ProviderQuickCheckResult } from '../../../../domain/providerProbe';
import type { StudioSettings } from '../../../../domain/studioSettings';
import { getProviderAdapterForSettings } from '../../../../entities/provider/registry';
import type { ApiFocus, SettingsSelectOption } from '../../settingsTypes';
import { firstModelForProvider, resolveInitialModelId, resolveInitialProviderId } from '../../model/settingsDraftSelection';
import { useComfyUiSettingsDraft } from './comfyui-settings/useComfyUiSettingsDraft';

interface UseGenerationApiSettingsDraftArgs {
  settings: StudioSettings;
  draft: StudioSettings;
  setDraft: Dispatch<SetStateAction<StudioSettings>>;
  markDirty: () => void;
  report: ProviderProbeReport | null;
  quickCheckResults: Record<string, ProviderQuickCheckResult>;
  notSetLabel: string;
}

function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeProvider(): GenerationProvider {
  return {
    ...defaultGenerationProvider,
    id: uid('provider'),
    name: 'New provider',
    apiKey: '',
    persistApiKey: false
  };
}

function makeModel(providerId: string, adapterId = 'openai-compatible'): GenerationModel {
  const isComfy = adapterId === 'comfyui';
  return {
    id: uid('model'),
    name: isComfy ? 'ComfyUI checkpoint' : 'New model',
    providerId,
    modelId: isComfy ? '' : 'model-id',
    notes: ''
  };
}

export function useGenerationApiSettingsDraft({
  settings,
  draft,
  setDraft,
  markDirty,
  report,
  quickCheckResults,
  notSetLabel
}: UseGenerationApiSettingsDraftArgs) {
  const [apiFocus, setApiFocus] = useState<ApiFocus>('providers');
  const [selectedProviderId, setSelectedProviderId] = useState<string>(() => resolveInitialProviderId(settings));
  const [selectedModelId, setSelectedModelId] = useState<string>(() => resolveInitialModelId(settings));

  const comfyUi = useComfyUiSettingsDraft({
    draft,
    setDraft,
    markDirty,
    setSelectedProviderId,
    setSelectedModelId,
    setApiFocus
  });

  const resetSelectionFrom = (nextSettings: StudioSettings) => {
    setSelectedModelId(resolveInitialModelId(nextSettings));
    setSelectedProviderId(resolveInitialProviderId(nextSettings));
    comfyUi.resetComfyUiSelectionFrom(nextSettings);
  };

  useEffect(() => {
    resetSelectionFrom(settings);
  }, [settings]);

  const selectedProvider = useMemo(
    () => draft.providers.find((provider) => provider.id === selectedProviderId) ?? draft.providers[0] ?? null,
    [draft.providers, selectedProviderId]
  );
  const selectedModel = useMemo(
    () => draft.models.find((model) => model.id === selectedModelId) ?? draft.models[0] ?? null,
    [draft.models, selectedModelId]
  );
  const modelsForSelectedProvider = useMemo(
    () => selectedProvider ? draft.models.filter((model) => model.providerId === selectedProvider.id) : [],
    [draft.models, selectedProvider]
  );

  const patchProvider = (key: keyof GenerationProvider, value: GenerationProvider[keyof GenerationProvider]) => {
    if (!selectedProvider) return;
    markDirty();
    setDraft((prev) => ({
      ...prev,
      providers: prev.providers.map((provider) => provider.id === selectedProvider.id ? { ...provider, [key]: value } : provider)
    }));
  };

  const patchModel = (key: keyof GenerationModel, value: GenerationModel[keyof GenerationModel]) => {
    if (!selectedModel) return;
    markDirty();
    setDraft((prev) => ({
      ...prev,
      models: prev.models.map((model) => model.id === selectedModel.id ? { ...model, [key]: value } : model),
      selectedModelId: selectedModel.id
    }));
  };

  const addProvider = () => {
    const provider = makeProvider();
    const model = makeModel(provider.id);
    markDirty();
    setDraft((prev) => ({
      ...prev,
      providers: [...prev.providers, provider],
      models: [...prev.models, model],
      selectedModelId: model.id
    }));
    setSelectedProviderId(provider.id);
    setSelectedModelId(model.id);
    setApiFocus('providers');
  };

  const removeProvider = () => {
    if (!selectedProvider || draft.providers.length <= 1) return;
    const providers = draft.providers.filter((provider) => provider.id !== selectedProvider.id);
    const models = draft.models.filter((model) => model.providerId !== selectedProvider.id);
    const selected = models[0]?.id ?? '';
    markDirty();
    setDraft((prev) => ({
      ...prev,
      providers: prev.providers.filter((provider) => provider.id !== selectedProvider.id),
      models: prev.models.filter((model) => model.providerId !== selectedProvider.id),
      selectedModelId: selected
    }));
    setSelectedProviderId(providers[0]?.id ?? '');
    setSelectedModelId(selected);
  };

  const addModel = () => {
    const providerId = selectedProvider?.id ?? draft.providers[0]?.id;
    if (!providerId) return;
    const provider = draft.providers.find((item) => item.id === providerId) ?? null;
    const adapterId = getProviderAdapterForSettings(provider).id;
    const model = makeModel(providerId, adapterId);
    markDirty();
    setDraft((prev) => ({ ...prev, models: [...prev.models, model], selectedModelId: model.id }));
    setSelectedModelId(model.id);
    setApiFocus('models');
  };

  const removeModel = () => {
    if (!selectedModel || draft.models.length <= 1) return;
    const models = draft.models.filter((model) => model.id !== selectedModel.id);
    const selected = models[0]?.id ?? '';
    markDirty();
    setDraft((prev) => ({
      ...prev,
      models: prev.models.filter((model) => model.id !== selectedModel.id),
      selectedModelId: selected
    }));
    setSelectedModelId(selected);
  };

  const selectModel = (model: GenerationModel) => {
    setSelectedModelId(model.id);
    setSelectedProviderId(model.providerId);
    setDraft((prev) => ({ ...prev, selectedModelId: model.id }));
    markDirty();
  };

  const providerOptions: SettingsSelectOption[] = draft.providers.map((provider) => ({
    value: provider.id,
    label: provider.name,
    description: provider.generationEndpoint || notSetLabel
  }));

  const probeModel = selectedProvider ? (selectedModel?.providerId === selectedProvider.id ? selectedModel : firstModelForProvider(draft, selectedProvider.id)) : null;
  const quickResult = selectedProvider ? quickCheckResults[selectedProvider.id] : null;
  const showReport = selectedProvider && selectedModel?.providerId === selectedProvider.id && selectedModel.id === settings.selectedModelId ? report : null;

  return {
    apiFocus,
    setApiFocus,
    selectedProvider,
    selectedModel,
    selectedProviderId,
    selectedModelId,
    setSelectedProviderId,
    setSelectedModelId,
    modelsForSelectedProvider,
    providerOptions,
    probeModel,
    quickResult,
    showReport,
    addProvider,
    removeProvider,
    addModel,
    removeModel,
    selectModel,
    patchProvider,
    patchModel,
    firstModelForProvider,
    resetSelectionFrom,
    ...comfyUi
  };
}
