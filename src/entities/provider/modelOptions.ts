import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';

export interface ProviderModelOption {
  value: string;
  label: string;
  description: string;
}

export function getSelectedModel(models: readonly GenerationModel[], selectedModelId: string): GenerationModel | null {
  return models.find((model) => model.id === selectedModelId) ?? models[0] ?? null;
}

export function getProviderModelOptions(
  models: readonly GenerationModel[],
  providers: readonly GenerationProvider[]
): ProviderModelOption[] {
  const providerNamesById = new Map(providers.map((provider) => [provider.id, provider.name]));

  return models.map((model) => ({
    value: model.id,
    label: model.name || model.modelId,
    description: [model.modelId, providerNamesById.get(model.providerId)].filter(Boolean).join(' · ')
  }));
}
