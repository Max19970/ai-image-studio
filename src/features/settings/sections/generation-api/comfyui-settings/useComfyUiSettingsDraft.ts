import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  cacheKeyForComfyUiResources,
  readComfyUiSettingsData,
  updateComfyUiResourceCache,
  writeComfyUiSettingsData,
  type ComfyUiLoraRegistration
} from '../../../../../domain/comfyUiSettings';
import { defaultGenerationProvider } from '../../../../../domain/defaults';
import type { GenerationModel, GenerationProvider } from '../../../../../domain/providerSettings';
import type { StudioSettings } from '../../../../../domain/studioSettings';
import { getProviderAdapterForSettings } from '../../../../../entities/provider/registry';
import { toProviderSettings } from '../../../../../entities/studio-settings';
import { fetchProviderResources } from '../../../../../infrastructure/api';
import type { ApiFocus } from '../../../settingsTypes';
import { firstModelForProvider } from '../../../model/settingsDraftSelection';

interface UseComfyUiSettingsDraftArgs {
  draft: StudioSettings;
  setDraft: Dispatch<SetStateAction<StudioSettings>>;
  markDirty: () => void;
  setSelectedProviderId: Dispatch<SetStateAction<string>>;
  setSelectedModelId: Dispatch<SetStateAction<string>>;
  setApiFocus: Dispatch<SetStateAction<ApiFocus>>;
}

function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeComfyUiProvider(): GenerationProvider {
  return {
    ...defaultGenerationProvider,
    id: uid('provider'),
    name: 'Local ComfyUI',
    adapterId: 'comfyui',
    generationEndpoint: 'http://127.0.0.1:8188',
    editEndpoint: '',
    responsesEndpoint: '',
    apiKey: '',
    authHeaderName: '',
    authScheme: '',
    timeoutMs: 900_000,
    persistApiKey: false
  };
}

function makeComfyUiModel(providerId: string): GenerationModel {
  return {
    id: uid('model'),
    name: 'ComfyUI checkpoint',
    providerId,
    modelId: '',
    notes: ''
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useComfyUiSettingsDraft({
  draft,
  setDraft,
  markDirty,
  setSelectedProviderId,
  setSelectedModelId,
  setApiFocus
}: UseComfyUiSettingsDraftArgs) {
  const [selectedComfyUiProviderId, setSelectedComfyUiProviderId] = useState<string>('');
  const [comfyUiResourcesLoading, setComfyUiResourcesLoading] = useState(false);
  const [comfyUiResourcesError, setComfyUiResourcesError] = useState<string | null>(null);

  const comfyUiData = useMemo(() => readComfyUiSettingsData(draft), [draft]);
  const comfyUiProviders = useMemo(
    () => draft.providers.filter((provider) => getProviderAdapterForSettings(provider).id === 'comfyui'),
    [draft.providers]
  );
  const selectedComfyUiProvider = useMemo(
    () => comfyUiProviders.find((provider) => provider.id === selectedComfyUiProviderId) ?? comfyUiProviders[0] ?? null,
    [comfyUiProviders, selectedComfyUiProviderId]
  );

  useEffect(() => {
    if (!selectedComfyUiProvider && selectedComfyUiProviderId) {
      setSelectedComfyUiProviderId(comfyUiProviders[0]?.id ?? '');
      return;
    }
    if (!selectedComfyUiProviderId && comfyUiProviders[0]) setSelectedComfyUiProviderId(comfyUiProviders[0].id);
  }, [comfyUiProviders, selectedComfyUiProvider, selectedComfyUiProviderId]);

  const resetComfyUiSelectionFrom = (settings: StudioSettings) => {
    const firstComfy = settings.providers.find((provider) => getProviderAdapterForSettings(provider).id === 'comfyui');
    setSelectedComfyUiProviderId(firstComfy?.id ?? '');
  };

  const addComfyUiProvider = () => {
    const provider = makeComfyUiProvider();
    const model = makeComfyUiModel(provider.id);
    markDirty();
    setDraft((prev) => ({
      ...prev,
      providers: [...prev.providers, provider],
      models: [...prev.models, model],
      selectedModelId: model.id
    }));
    setSelectedProviderId(provider.id);
    setSelectedModelId(model.id);
    setSelectedComfyUiProviderId(provider.id);
    setApiFocus('comfyui');
  };

  const refreshComfyUiResources = useCallback(async (providerId?: string) => {
    const targetProvider = draft.providers.find((provider) => provider.id === (providerId ?? selectedComfyUiProvider?.id));
    if (!targetProvider) return;
    setComfyUiResourcesLoading(true);
    setComfyUiResourcesError(null);
    try {
      const model = firstModelForProvider(draft, targetProvider.id);
      const providerSettings = toProviderSettings(targetProvider, model);
      const [checkpoints, loras, samplers, schedulers] = await Promise.all([
        fetchProviderResources(providerSettings, 'checkpoints'),
        fetchProviderResources(providerSettings, 'loras'),
        fetchProviderResources(providerSettings, 'samplers'),
        fetchProviderResources(providerSettings, 'schedulers')
      ]);
      markDirty();
      setDraft((prev) => [checkpoints, loras, samplers, schedulers].reduce(
        (next, list) => updateComfyUiResourceCache(next, targetProvider.id, list),
        prev
      ));
    } catch (error) {
      setComfyUiResourcesError(errorMessage(error));
    } finally {
      setComfyUiResourcesLoading(false);
    }
  }, [draft, markDirty, selectedComfyUiProvider, setDraft]);

  const addComfyUiLora = () => {
    const firstResource = selectedComfyUiProvider ? comfyUiData.resourceCache[cacheKeyForComfyUiResources(selectedComfyUiProvider.id, 'loras')]?.items[0] : null;
    const loraName = firstResource?.name ?? '';
    const lora: ComfyUiLoraRegistration = {
      id: uid('lora'),
      displayName: loraName ? loraName.replace(/\.(safetensors|pt|ckpt)$/i, '') : 'New LoRA',
      loraName,
      notes: '',
      defaultStrengthModel: 1,
      defaultStrengthClip: 1
    };
    markDirty();
    setDraft((prev) => {
      const data = readComfyUiSettingsData(prev);
      return writeComfyUiSettingsData(prev, { ...data, loras: [...data.loras, lora] });
    });
  };

  const removeComfyUiLora = (id: string) => {
    markDirty();
    setDraft((prev) => {
      const data = readComfyUiSettingsData(prev);
      return writeComfyUiSettingsData(prev, { ...data, loras: data.loras.filter((lora) => lora.id !== id) });
    });
  };

  const patchComfyUiLora = <K extends keyof ComfyUiLoraRegistration>(id: string, key: K, value: ComfyUiLoraRegistration[K]) => {
    markDirty();
    setDraft((prev) => {
      const data = readComfyUiSettingsData(prev);
      return writeComfyUiSettingsData(prev, {
        ...data,
        loras: data.loras.map((lora) => lora.id === id ? { ...lora, [key]: value } : lora)
      });
    });
  };

  return {
    comfyUiData,
    comfyUiProviders,
    selectedComfyUiProviderId,
    selectedComfyUiProvider,
    setSelectedComfyUiProviderId,
    comfyUiCheckpointCache: selectedComfyUiProvider ? comfyUiData.resourceCache[cacheKeyForComfyUiResources(selectedComfyUiProvider.id, 'checkpoints')] ?? null : null,
    comfyUiLoraCache: selectedComfyUiProvider ? comfyUiData.resourceCache[cacheKeyForComfyUiResources(selectedComfyUiProvider.id, 'loras')] ?? null : null,
    comfyUiSamplerCache: selectedComfyUiProvider ? comfyUiData.resourceCache[cacheKeyForComfyUiResources(selectedComfyUiProvider.id, 'samplers')] ?? null : null,
    comfyUiSchedulerCache: selectedComfyUiProvider ? comfyUiData.resourceCache[cacheKeyForComfyUiResources(selectedComfyUiProvider.id, 'schedulers')] ?? null : null,
    comfyUiResourcesLoading,
    comfyUiResourcesError,
    resetComfyUiSelectionFrom,
    refreshComfyUiResources,
    addComfyUiProvider,
    addComfyUiLora,
    removeComfyUiLora,
    patchComfyUiLora
  };
}
