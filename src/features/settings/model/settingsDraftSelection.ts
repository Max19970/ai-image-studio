import type { GenerationModel } from '../../../domain/providerSettings';
import type { StudioSettings } from '../../../domain/studioSettings';

export function firstModelForProvider(settings: StudioSettings, providerId: string): GenerationModel | null {
  return settings.models.find((model) => model.providerId === providerId) ?? null;
}

export function resolveInitialProviderId(settings: StudioSettings) {
  const selectedModel = settings.models.find((model) => model.id === settings.selectedModelId) ?? settings.models[0];
  return selectedModel?.providerId ?? settings.providers[0]?.id ?? '';
}

export function resolveInitialModelId(settings: StudioSettings) {
  return settings.selectedModelId || settings.models[0]?.id || '';
}

export function resolveSafeSelectedModelId(settings: StudioSettings, preferredModelId: string) {
  return settings.models.some((model) => model.id === preferredModelId)
    ? preferredModelId
    : settings.models[0]?.id ?? '';
}
