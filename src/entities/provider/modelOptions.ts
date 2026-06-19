import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';

export interface ProviderModelOption {
  value: string;
  label: string;
  description: string;
  providerId: string;
  providerName: string;
  modelId: string;
}

export interface ProviderModelGroup {
  providerId: string;
  providerName: string;
  providerAdapterId?: string;
  models: ProviderModelOption[];
  disabled: boolean;
  selected: boolean;
}

export function getSelectedModel(models: readonly GenerationModel[], selectedModelId: string): GenerationModel | null {
  return models.find((model) => model.id === selectedModelId) ?? models[0] ?? null;
}

export function getProviderForSelectedModel(
  providers: readonly GenerationProvider[],
  selectedModel: GenerationModel | null
): GenerationProvider | null {
  if (!selectedModel) return providers[0] ?? null;
  return providers.find((provider) => provider.id === selectedModel.providerId) ?? providers[0] ?? null;
}

export function getProviderModelOptions(
  models: readonly GenerationModel[],
  providers: readonly GenerationProvider[]
): ProviderModelOption[] {
  const providerNamesById = new Map(providers.map((provider) => [provider.id, provider.name]));

  return models.map((model) => {
    const providerName = providerNamesById.get(model.providerId) ?? 'Provider';
    return {
      value: model.id,
      label: model.name || model.modelId,
      description: [model.modelId, providerName].filter(Boolean).join(' · '),
      providerId: model.providerId,
      providerName,
      modelId: model.modelId
    };
  });
}

export function getProviderModelGroups(
  models: readonly GenerationModel[],
  providers: readonly GenerationProvider[],
  selectedModelId: string
): ProviderModelGroup[] {
  const options = getProviderModelOptions(models, providers);
  const optionsByProvider = new Map<string, ProviderModelOption[]>();
  options.forEach((option) => {
    const list = optionsByProvider.get(option.providerId) ?? [];
    list.push(option);
    optionsByProvider.set(option.providerId, list);
  });

  const providerGroups = providers.map((provider) => {
    const providerModels = optionsByProvider.get(provider.id) ?? [];
    return {
      providerId: provider.id,
      providerName: provider.name,
      providerAdapterId: provider.adapterId,
      models: providerModels,
      disabled: providerModels.length === 0,
      selected: providerModels.some((model) => model.value === selectedModelId)
    } satisfies ProviderModelGroup;
  });

  const knownProviderIds = new Set(providers.map((provider) => provider.id));
  const orphanOptions = options.filter((option) => !knownProviderIds.has(option.providerId));
  if (orphanOptions.length === 0) return providerGroups;

  return [
    ...providerGroups,
    {
      providerId: '__unknown__',
      providerName: 'Unknown provider',
      models: orphanOptions,
      disabled: false,
      selected: orphanOptions.some((model) => model.value === selectedModelId)
    }
  ];
}

export function getFirstModelIdForProviderGroup(group: ProviderModelGroup | undefined): string | null {
  return group?.models[0]?.value ?? null;
}
