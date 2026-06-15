import { defaultGenerationModel, defaultGenerationProvider, defaultImageParams, defaultProviderSettings, defaultStudioSettings } from '../domain/defaults';
import type { AttachmentSummary, BatchGenerationItem, GeneratedImage, GenerationModel, GenerationProvider, GenerationTask, ImageParams, InterfaceTheme, ProviderProbeReport, ProviderSettings, StudioSettings } from '../domain/types';

const legacyProviderKey = 'gpt-image-2-studio.provider.v2';
const studioSettingsKey = 'image-studio.settings.v1';
const paramsKey = 'gpt-image-2-studio.params.v2';
const probeCacheKey = 'gpt-image-2-studio.probe-cache.v1';
const generationTasksKey = 'image-studio.generation-tasks.v1';

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return { ...fallback, ...JSON.parse(value) };
  } catch {
    return fallback;
  }
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeImageParams(value: Partial<ImageParams> | null | undefined): ImageParams {
  return {
    ...defaultImageParams,
    ...(value ?? {}),
    retryAttempts: Math.max(0, Math.min(10, Number(value?.retryAttempts ?? defaultImageParams.retryAttempts) || 0)),
    retryDelaySeconds: Math.max(0, Math.min(600, Number(value?.retryDelaySeconds ?? defaultImageParams.retryDelaySeconds) || 0))
  };
}

function sanitizeAttachment(attachment: Partial<AttachmentSummary>): AttachmentSummary {
  const previewUrl = typeof attachment.previewUrl === 'string' && !attachment.previewUrl.startsWith('blob:') ? attachment.previewUrl : undefined;
  return {
    role: attachment.role === 'mask' || attachment.role === 'reference' || attachment.role === 'target' ? attachment.role : 'reference',
    name: attachment.name || 'attachment',
    size: Number(attachment.size ?? 0),
    type: attachment.type || '',
    ...(previewUrl ? { previewUrl } : {})
  };
}

function sanitizeGeneratedImage(image: Partial<GeneratedImage>, fallbackIndex = 0): GeneratedImage | null {
  if (!image.src || typeof image.src !== 'string') return null;
  if (image.src.startsWith('blob:')) return null;
  return {
    id: image.id || uid('image'),
    taskId: image.taskId,
    batchItemId: image.batchItemId,
    batchItemIndex: image.batchItemIndex,
    src: image.src,
    format: image.format || 'png',
    kind: image.kind === 'partial' ? 'partial' : 'final',
    index: Number.isFinite(Number(image.index)) ? Number(image.index) : fallbackIndex,
    createdAt: Number(image.createdAt ?? Date.now()),
    raw: image.raw,
    request: image.request ? sanitizeRequestSnapshot(image.request as any) : undefined
  };
}

function normalizeTaskStatus(status: unknown): GenerationTask['status'] {
  return status === 'queued' || status === 'streaming' || status === 'failed' || status === 'succeeded' ? status : 'failed';
}

function sanitizeRequestSnapshot(snapshot: Partial<GenerationTask['request']>): GenerationTask['request'] {
  return {
    createdAt: Number(snapshot.createdAt ?? Date.now()),
    mode: snapshot.mode === 'edit' ? 'edit' : 'generate',
    prompt: snapshot.prompt || '',
    endpoint: snapshot.endpoint || '',
    providerLabel: snapshot.providerLabel || '',
    model: snapshot.model || '',
    modelLabel: snapshot.modelLabel || '',
    payload: snapshot.payload && typeof snapshot.payload === 'object' ? snapshot.payload as Record<string, unknown> : {},
    warnings: Array.isArray(snapshot.warnings) ? snapshot.warnings.map(String) : [],
    attachments: Array.isArray(snapshot.attachments) ? snapshot.attachments.map((item) => sanitizeAttachment(item as Partial<AttachmentSummary>)) : [],
    params: {
      n: Number(snapshot.params?.n ?? defaultImageParams.n),
      sizeMode: snapshot.params?.sizeMode === 'auto' || snapshot.params?.sizeMode === 'custom' ? snapshot.params.sizeMode : 'preset',
      sizePreset: snapshot.params?.sizePreset || defaultImageParams.sizePreset,
      width: Number(snapshot.params?.width ?? defaultImageParams.width),
      height: Number(snapshot.params?.height ?? defaultImageParams.height),
      quality: snapshot.params?.quality ?? defaultImageParams.quality,
      background: snapshot.params?.background ?? defaultImageParams.background,
      moderation: snapshot.params?.moderation ?? defaultImageParams.moderation,
      outputFormat: snapshot.params?.outputFormat ?? defaultImageParams.outputFormat,
      outputCompression: Number(snapshot.params?.outputCompression ?? defaultImageParams.outputCompression),
      stream: Boolean(snapshot.params?.stream ?? defaultImageParams.stream),
      partialImages: Number(snapshot.params?.partialImages ?? defaultImageParams.partialImages),
      inputFidelity: snapshot.params?.inputFidelity ?? defaultImageParams.inputFidelity,
      style: snapshot.params?.style ?? defaultImageParams.style,
      retryAttempts: Math.max(0, Math.min(10, Number(snapshot.params?.retryAttempts ?? defaultImageParams.retryAttempts) || 0)),
      retryDelaySeconds: Math.max(0, Math.min(600, Number(snapshot.params?.retryDelaySeconds ?? defaultImageParams.retryDelaySeconds) || 0))
    }
  };
}

function sanitizeBatchItem(item: Partial<BatchGenerationItem>, taskId: string, fallbackIndex = 0): BatchGenerationItem {
  const request = sanitizeRequestSnapshot((item.request ?? {}) as any);
  const status = normalizeTaskStatus(item.status);
  const images = Array.isArray(item.images)
    ? item.images.flatMap((image, index) => {
      const normalized = sanitizeGeneratedImage(image as Partial<GeneratedImage>, index);
      return normalized ? [{ ...normalized, taskId, batchItemId: item.id || `batch-item-${fallbackIndex}`, batchItemIndex: fallbackIndex, request: normalized.request ?? request }] : [];
    })
    : [];

  return {
    id: item.id || uid('batch-item'),
    index: Number.isFinite(Number(item.index)) ? Number(item.index) : fallbackIndex,
    status: status === 'queued' || status === 'streaming' ? 'failed' : status,
    request,
    images,
    raw: item.raw,
    error: status === 'queued' || status === 'streaming' ? 'Interrupted by page reload.' : item.error ?? null
  };
}

export function sanitizeGenerationTask(task: Partial<GenerationTask>): GenerationTask | null {
  const id = task.id || uid('task');
  const request = sanitizeRequestSnapshot((task.request ?? {}) as any);
  const loadedStatus = normalizeTaskStatus(task.status);
  const status = loadedStatus === 'queued' || loadedStatus === 'streaming' ? 'failed' : loadedStatus;
  const images = Array.isArray(task.images)
    ? task.images.flatMap((image, index) => {
      const normalized = sanitizeGeneratedImage(image as Partial<GeneratedImage>, index);
      return normalized ? [{ ...normalized, taskId: id, request: normalized.request ?? request }] : [];
    })
    : [];
  const batchItems = Array.isArray(task.batch?.items) ? task.batch.items.map((item, index) => sanitizeBatchItem(item as Partial<BatchGenerationItem>, id, index)) : [];

  return {
    id,
    kind: task.kind === 'batch' ? 'batch' : 'single',
    status,
    createdAt: Number(task.createdAt ?? request.createdAt ?? Date.now()),
    updatedAt: Number(task.updatedAt ?? task.createdAt ?? Date.now()),
    request,
    images,
    batch: task.kind === 'batch' || batchItems.length > 0 ? {
      intervalMs: Number(task.batch?.intervalMs ?? 0),
      items: batchItems
    } : undefined,
    raw: task.raw,
    error: loadedStatus === 'queued' || loadedStatus === 'streaming' ? 'Interrupted by page reload.' : task.error ?? null
  };
}

function normalizeInterfaceTheme(value: unknown): InterfaceTheme {
  return value === 'midnight' || value === 'ember' || value === 'meadow' || value === 'mono' || value === 'glass' ? value : 'glass';
}

function normalizeProvider(provider: Partial<GenerationProvider>, fallback = defaultGenerationProvider): GenerationProvider {
  return {
    id: provider.id || fallback.id || uid('provider'),
    name: provider.name || fallback.name || 'Provider',
    generationEndpoint: provider.generationEndpoint ?? fallback.generationEndpoint,
    editEndpoint: provider.editEndpoint ?? fallback.editEndpoint,
    responsesEndpoint: provider.responsesEndpoint ?? fallback.responsesEndpoint,
    apiKey: provider.apiKey ?? fallback.apiKey,
    authHeaderName: provider.authHeaderName ?? fallback.authHeaderName,
    authScheme: provider.authScheme ?? fallback.authScheme,
    customHeadersJson: provider.customHeadersJson ?? fallback.customHeadersJson,
    timeoutMs: Number(provider.timeoutMs ?? fallback.timeoutMs),
    persistApiKey: Boolean(provider.persistApiKey ?? fallback.persistApiKey)
  };
}

function normalizeModel(model: Partial<GenerationModel>, providerId: string, fallback = defaultGenerationModel): GenerationModel {
  return {
    id: model.id || fallback.id || uid('model'),
    name: model.name || fallback.name || model.modelId || 'Model',
    providerId: model.providerId || providerId,
    modelId: model.modelId || fallback.modelId || defaultProviderSettings.modelId,
    notes: model.notes ?? fallback.notes ?? ''
  };
}

function migrateLegacyProvider(): StudioSettings {
  const loaded = safeJson<ProviderSettings>(localStorage.getItem(legacyProviderKey), defaultProviderSettings);
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
  return {
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

export function getEffectiveProviderSettings(settings: StudioSettings): ProviderSettings {
  const model = getActiveModel(settings);
  return toProviderSettings(getProviderForModel(settings, model), model);
}

export function getProviderFingerprint(settings: ProviderSettings): string {
  return [
    settings.generationEndpoint.trim(),
    settings.editEndpoint.trim(),
    settings.responsesEndpoint.trim(),
    settings.modelId.trim(),
    settings.authHeaderName.trim(),
    settings.authScheme.trim(),
    settings.customHeadersJson.trim()
  ].join('|');
}

export function loadStudioSettings(): StudioSettings {
  const raw = localStorage.getItem(studioSettingsKey);
  if (!raw) return migrateLegacyProvider();

  try {
    const parsed = JSON.parse(raw) as Partial<StudioSettings>;
    const providers = asArray<Partial<GenerationProvider>>(parsed.providers).map((provider, index) => normalizeProvider(provider, index === 0 ? defaultGenerationProvider : { ...defaultGenerationProvider, id: uid('provider'), name: 'Provider' }));
    const safeProviders = providers.length > 0 ? providers : [defaultGenerationProvider];
    const models = asArray<Partial<GenerationModel>>(parsed.models).map((model, index) => normalizeModel(model, safeProviders[0].id, index === 0 ? defaultGenerationModel : { ...defaultGenerationModel, id: uid('model'), name: 'Model', providerId: safeProviders[0].id }));
    const safeModels = models.length > 0 ? models : [normalizeModel({ ...defaultGenerationModel, providerId: safeProviders[0].id }, safeProviders[0].id)];
    const selectedModelId = safeModels.some((model) => model.id === parsed.selectedModelId) ? String(parsed.selectedModelId) : safeModels[0].id;

    safeProviders.forEach((provider) => {
      if (!provider.persistApiKey) provider.apiKey = '';
    });

    return { providers: safeProviders, models: safeModels, selectedModelId, interfaceTheme: normalizeInterfaceTheme(parsed.interfaceTheme) };
  } catch {
    return defaultStudioSettings;
  }
}

export function saveStudioSettings(settings: StudioSettings) {
  const copy: StudioSettings = {
    ...settings,
    providers: settings.providers.map((provider) => ({ ...provider, apiKey: provider.persistApiKey ? provider.apiKey : '' }))
  };
  localStorage.setItem(studioSettingsKey, JSON.stringify(copy));
}

export function loadProviderSettings(): ProviderSettings {
  return getEffectiveProviderSettings(loadStudioSettings());
}

export function saveProviderSettings(settings: ProviderSettings) {
  const current = loadStudioSettings();
  const model = getActiveModel(current);
  const provider = getProviderForModel(current, model);
  if (!provider || !model) return;

  saveStudioSettings({
    ...current,
    providers: current.providers.map((item) => item.id === provider.id ? normalizeProvider({ ...item, ...settings, id: item.id, name: item.name }) : item),
    models: current.models.map((item) => item.id === model.id ? { ...item, modelId: settings.modelId, name: item.name || settings.modelId } : item)
  });
}

export function loadImageParams(): ImageParams {
  return normalizeImageParams(safeJson<ImageParams>(localStorage.getItem(paramsKey), defaultImageParams));
}

export function saveImageParams(params: ImageParams) {
  localStorage.setItem(paramsKey, JSON.stringify(params));
}

function loadProbeCacheMap(): Record<string, ProviderProbeReport> {
  try {
    const raw = localStorage.getItem(probeCacheKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, ProviderProbeReport> : {};
  } catch {
    return {};
  }
}

function saveProbeCacheMap(map: Record<string, ProviderProbeReport>) {
  localStorage.setItem(probeCacheKey, JSON.stringify(map));
}

export function loadProviderProbeReport(settings: ProviderSettings): ProviderProbeReport | null {
  const map = loadProbeCacheMap();
  return map[getProviderFingerprint(settings)] ?? null;
}

export function saveProviderProbeReport(report: ProviderProbeReport) {
  const map = loadProbeCacheMap();
  map[report.fingerprint] = report;
  saveProbeCacheMap(map);
}

export function clearProviderProbeReport(settings: ProviderSettings) {
  const fingerprint = getProviderFingerprint(settings);
  const map = loadProbeCacheMap();
  delete map[fingerprint];
  saveProbeCacheMap(map);
}


export function normalizeGenerationTasks(tasks: unknown, limit = 120): GenerationTask[] {
  if (!Array.isArray(tasks)) return [];
  return tasks
    .slice(0, limit)
    .flatMap((task) => {
      const normalized = sanitizeGenerationTask(task as Partial<GenerationTask>);
      return normalized ? [normalized] : [];
    });
}

export function loadGenerationTasks(): GenerationTask[] {
  try {
    const raw = localStorage.getItem(generationTasksKey);
    if (!raw) return [];
    return normalizeGenerationTasks(JSON.parse(raw), 80);
  } catch {
    return [];
  }
}

function saveGenerationTasksFallback(tasks: GenerationTask[]) {
  try {
    const lightTasks = normalizeGenerationTasks(tasks, 40).map((task) => ({
      ...task,
      raw: undefined,
      images: task.images.slice(0, 3).map((image) => ({ ...image, raw: undefined })),
      batch: task.batch ? {
        ...task.batch,
        items: task.batch.items.map((item) => ({ ...item, raw: undefined, images: item.images.slice(0, 3).map((image) => ({ ...image, raw: undefined })) }))
      } : undefined
    }));
    localStorage.setItem(generationTasksKey, JSON.stringify(lightTasks));
  } catch (error) {
    console.warn('Could not persist even the light generation history cache.', error);
  }
}

async function fetchStorage(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach local storage backend. Make sure the Express server is running. ${message}`);
  }
}

export async function loadGenerationTasksFromDatabase(): Promise<GenerationTask[]> {
  try {
    const response = await fetchStorage('/api/storage/generation-tasks');
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json() as { tasks?: unknown };
    return normalizeGenerationTasks(data.tasks, 120);
  } catch (error) {
    console.warn('Falling back to local generation history cache.', error);
    return loadGenerationTasks();
  }
}

export async function saveGenerationTasks(tasks: GenerationTask[]): Promise<void> {
  const safeTasks = normalizeGenerationTasks(tasks, 120);
  try {
    const response = await fetchStorage('/api/storage/generation-tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: safeTasks })
    });
    if (!response.ok) throw new Error(await response.text());
    // Keep only a small emergency cache in localStorage; the real history lives in the encrypted SQLite DB.
    saveGenerationTasksFallback(safeTasks);
  } catch (error) {
    console.warn('Could not persist generation history to the encrypted database. Using local fallback cache.', error);
    saveGenerationTasksFallback(safeTasks);
  }
}

export async function clearGenerationTasksDatabase(): Promise<void> {
  try {
    const response = await fetchStorage('/api/storage/generation-tasks', { method: 'DELETE' });
    if (!response.ok) throw new Error(await response.text());
    localStorage.removeItem(generationTasksKey);
  } catch (error) {
    console.warn('Could not clear encrypted generation history database.', error);
    localStorage.removeItem(generationTasksKey);
  }
}
