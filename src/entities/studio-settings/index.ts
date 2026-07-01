import { defaultGenerationModel, defaultGenerationProvider, defaultImageParams, defaultProviderSettings, defaultStudioSettings } from '../../domain/defaults';
import type { GenerationModel, GenerationProvider, ProviderSettings } from '../../domain/providerSettings';
import type { InterfaceTheme, StudioSettings } from '../../domain/studioSettings';

export function createStorageUid(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function normalizeAdapterData(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return { ...(value as Record<string, unknown>) };
}

export function normalizeInterfaceTheme(value: unknown): InterfaceTheme {
  return value === 'midnight' || value === 'ember' || value === 'meadow' || value === 'mono' || value === 'glass' ? value : 'glass';
}

export function normalizeProvider(provider: Partial<GenerationProvider>, fallback = defaultGenerationProvider): GenerationProvider {
  return {
    ...fallback,
    ...provider,
    id: provider.id || fallback.id || createStorageUid('provider'),
    name: provider.name || fallback.name || 'Provider',
    adapterId: provider.adapterId ?? fallback.adapterId ?? 'openai-compatible',
    generationEndpoint: String(provider.generationEndpoint ?? fallback.generationEndpoint),
    editEndpoint: String(provider.editEndpoint ?? fallback.editEndpoint),
    responsesEndpoint: String(provider.responsesEndpoint ?? fallback.responsesEndpoint),
    apiKey: String(provider.apiKey ?? fallback.apiKey),
    authHeaderName: String(provider.authHeaderName ?? fallback.authHeaderName),
    authScheme: String(provider.authScheme ?? fallback.authScheme),
    customHeadersJson: String(provider.customHeadersJson ?? fallback.customHeadersJson),
    timeoutMs: Number(provider.timeoutMs ?? fallback.timeoutMs),
    persistApiKey: Boolean(provider.persistApiKey ?? fallback.persistApiKey)
  };
}

export function normalizeModel(model: Partial<GenerationModel>, providerId: string, fallback = defaultGenerationModel): GenerationModel {
  return {
    id: model.id || fallback.id || createStorageUid('model'),
    name: model.name || fallback.name || model.modelId || 'Model',
    providerId: model.providerId || providerId,
    modelId: model.modelId ?? fallback.modelId ?? defaultProviderSettings.modelId,
    notes: model.notes ?? fallback.notes ?? ''
  };
}

export function normalizeStudioSettings(value: Partial<StudioSettings> | null | undefined): StudioSettings {
  if (!value) return defaultStudioSettings;

  const providers = asArray<Partial<GenerationProvider>>(value.providers).map((provider, index) => normalizeProvider(
    provider,
    index === 0 ? defaultGenerationProvider : { ...defaultGenerationProvider, id: createStorageUid('provider'), name: 'Provider' }
  ));
  const safeProviders = providers.length > 0 ? providers : [defaultGenerationProvider];

  const models = asArray<Partial<GenerationModel>>(value.models).map((model, index) => normalizeModel(
    model,
    safeProviders[0].id,
    index === 0 ? defaultGenerationModel : { ...defaultGenerationModel, id: createStorageUid('model'), name: 'Model', providerId: safeProviders[0].id }
  ));
  const safeModels = models.length > 0 ? models : [normalizeModel({ ...defaultGenerationModel, providerId: safeProviders[0].id }, safeProviders[0].id)];
  const selectedModelId = safeModels.some((model) => model.id === value.selectedModelId) ? String(value.selectedModelId) : safeModels[0].id;

  safeProviders.forEach((provider) => {
    if (!provider.persistApiKey) provider.apiKey = '';
  });

  const adapterData = normalizeAdapterData(value.adapterData);

  return {
    providers: safeProviders,
    models: safeModels,
    selectedModelId,
    interfaceTheme: normalizeInterfaceTheme(value.interfaceTheme),
    ...(adapterData ? { adapterData } : {})
  };
}

export function sanitizeStudioSettingsForPersistence(settings: StudioSettings): StudioSettings {
  return normalizeStudioSettings({
    ...settings,
    providers: settings.providers.map((provider) => ({ ...provider, apiKey: provider.persistApiKey ? provider.apiKey : '' }))
  });
}

export function createStudioSettingsFromLegacyProvider(legacyProvider: ProviderSettings): StudioSettings {
  const loaded = { ...legacyProvider };
  if (!loaded.persistApiKey) loaded.apiKey = '';

  const provider = normalizeProvider({
    ...loaded,
    id: 'legacy-openai-compatible',
    name: loaded.generationEndpoint.includes('openai.com') ? 'OpenAI' : 'OpenAI-compatible provider'
  });
  const model = normalizeModel({
    id: `legacy-${loaded.modelId || defaultProviderSettings.modelId}`,
    name: loaded.modelId || 'Model',
    modelId: loaded.modelId || defaultProviderSettings.modelId,
    providerId: provider.id,
    notes: 'Migrated from the single-provider GPT Image 2 Studio settings.'
  }, provider.id);

  return { providers: [provider], models: [model], selectedModelId: model.id, interfaceTheme: 'glass' };
}

export function getActiveModel(settings: StudioSettings): GenerationModel | null {
  return settings.models.find((model) => model.id === settings.selectedModelId) ?? settings.models[0] ?? null;
}

export function getProviderForModel(settings: StudioSettings, model: GenerationModel | null): GenerationProvider | null {
  if (!model) return settings.providers[0] ?? null;
  return settings.providers.find((provider) => provider.id === model.providerId) ?? settings.providers[0] ?? null;
}

export function toProviderSettings(provider: GenerationProvider | null, model: GenerationModel | null): ProviderSettings {
  const safeProvider = provider ?? defaultGenerationProvider;
  const safeModel = model ?? defaultGenerationModel;
  const { id: _id, name: _name, ...providerSettings } = safeProvider;
  return {
    ...providerSettings,
    adapterId: safeProvider.adapterId ?? 'openai-compatible',
    generationEndpoint: safeProvider.generationEndpoint,
    editEndpoint: safeProvider.editEndpoint,
    responsesEndpoint: safeProvider.responsesEndpoint,
    apiKey: safeProvider.apiKey,
    modelId: safeModel.modelId,
    authHeaderName: safeProvider.authHeaderName,
    authScheme: safeProvider.authScheme,
    customHeadersJson: safeProvider.customHeadersJson,
    timeoutMs: safeProvider.timeoutMs,
    persistApiKey: safeProvider.persistApiKey
  };
}

export function providerContextForModel(settings: StudioSettings, modelId: string) {
  const model = settings.models.find((item) => item.id === modelId) ?? getActiveModel(settings);
  const generationProvider = getProviderForModel(settings, model);
  return {
    model,
    generationProvider,
    provider: toProviderSettings(generationProvider, model)
  };
}

export function normalizeSelectedModel(settings: StudioSettings): StudioSettings {
  if (settings.models.some((model) => model.id === settings.selectedModelId)) return settings;
  return { ...settings, selectedModelId: settings.models[0]?.id ?? '' };
}

export function getEffectiveProviderSettings(settings: StudioSettings): ProviderSettings {
  const model = getActiveModel(settings);
  return toProviderSettings(getProviderForModel(settings, model), model);
}

export function mergeProviderSettingsIntoStudioSettings(settings: StudioSettings, providerSettings: ProviderSettings): StudioSettings {
  const current = normalizeStudioSettings(settings);
  const model = getActiveModel(current);
  const provider = getProviderForModel(current, model);
  if (!provider || !model) return current;

  return normalizeStudioSettings({
    ...current,
    providers: current.providers.map((item) => item.id === provider.id ? normalizeProvider({ ...item, ...providerSettings, id: item.id, name: item.name }) : item),
    models: current.models.map((item) => item.id === model.id ? { ...item, modelId: providerSettings.modelId, name: item.name || providerSettings.modelId } : item)
  });
}

export { defaultImageParams };
