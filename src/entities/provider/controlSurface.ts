import type { StudioSettings } from '../../domain/studioSettings';
import type { GenerationModel, GenerationProvider } from '../../domain/providerSettings';
import { getProviderAdapterForSettings } from './registry';
import type { ProviderControlSurfaceDefinition } from './types';

export interface ProviderControlSurfaceContextInput {
  settings: StudioSettings;
  modelId: string;
  models?: readonly GenerationModel[];
  providers?: readonly GenerationProvider[];
}

export interface ProviderControlSurfaceContext {
  surface: ProviderControlSurfaceDefinition;
  provider: GenerationProvider | null;
  model: GenerationModel | null;
}

export function resolveProviderControlSurface(input: ProviderControlSurfaceContextInput): ProviderControlSurfaceContext {
  const models = input.models ?? input.settings.models;
  const providers = input.providers ?? input.settings.providers;
  const model = models.find((item) => item.id === input.modelId) ?? models[0] ?? null;
  const provider = model
    ? providers.find((item) => item.id === model.providerId) ?? providers[0] ?? null
    : providers[0] ?? null;
  const adapter = getProviderAdapterForSettings(provider);

  return {
    surface: adapter.controlSurface,
    provider,
    model
  };
}
