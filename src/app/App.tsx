import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageComposer } from '../components/ImageComposer';
import { ImageDetailPage } from '../components/ImageDetailPage';
import { MultiImageComposer } from '../components/MultiImageComposer';
import type { BatchComposerDraft } from '../components/MultiImageComposer';
import { ParametersModal } from '../components/ParametersModal';
import { ResultsGallery } from '../components/ResultsGallery';
import { SettingsPage } from '../components/SettingsPage';
import { StudioInfoPage } from '../components/StudioInfoPage';
import { StudioSidebar } from '../components/StudioSidebar';
import { useI18n } from '../i18n';
import { buildImagePayload, explainPayloadWarnings, validateCustomSize } from '../domain/requestBuilder';
import type {
  AttachmentSummary,
  BatchGenerationItem,
  GeneratedImage,
  GenerationModel,
  GenerationProvider,
  GenerationRequestSnapshot,
  GenerationStatus,
  GenerationTask,
  ImageParams,
  ProviderProbeReport,
  ProviderQuickCheckResult,
  ProviderSettings,
  StudioSettings,
  WorkMode
} from '../domain/types';
import { probeProvider, quickCheckProvider, submitImageRequest } from '../infrastructure/api';
import {
  clearProviderProbeReport,
  getActiveModel,
  getEffectiveProviderSettings,
  getProviderForModel,
  loadGenerationTasks,
  loadGenerationTasksFromDatabase,
  loadImageParams,
  loadProviderProbeReport,
  loadStudioSettings,
  saveGenerationTasks,
  clearGenerationTasksDatabase,
  saveImageParams,
  saveProviderProbeReport,
  saveStudioSettings,
  toProviderSettings
} from '../infrastructure/storage';

function summarizeFile(role: AttachmentSummary['role'], file: File): AttachmentSummary {
  return {
    role,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl: URL.createObjectURL(file)
  };
}

function summarizeAttachments(targetImage: File | null, referenceImages: File[], mask: File | null): AttachmentSummary[] {
  const attachments: AttachmentSummary[] = [];
  if (targetImage) attachments.push(summarizeFile('target', targetImage));
  referenceImages.forEach((file) => attachments.push(summarizeFile('reference', file)));
  if (mask) attachments.push(summarizeFile('mask', mask));
  return attachments;
}

function cloneParams(params: ImageParams): ImageParams {
  return { ...params };
}


function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Request was cancelled.', 'AbortError'));
      return;
    }
    const id = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(id);
      reject(new DOMException('Request was cancelled.', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function providerContextForModel(settings: StudioSettings, modelId: string) {
  const model = settings.models.find((item) => item.id === modelId) ?? getActiveModel(settings);
  const generationProvider = getProviderForModel(settings, model);
  return {
    model,
    generationProvider,
    provider: toProviderSettings(generationProvider, model)
  };
}

function captureRequestSnapshot(args: {
  mode: WorkMode;
  params: ImageParams;
  provider: ProviderSettings;
  activeProvider: GenerationProvider | null;
  activeModel: GenerationModel | null;
  payload: Record<string, unknown>;
  warnings: string[];
  targetImage: File | null;
  referenceImages: File[];
  mask: File | null;
  fallbackProviderLabel: string;
}): GenerationRequestSnapshot {
  const { mode, params, provider, activeProvider, activeModel, payload, warnings, targetImage, referenceImages, mask, fallbackProviderLabel } = args;
  return {
    createdAt: Date.now(),
    mode,
    prompt: params.prompt.trim(),
    endpoint: mode === 'generate' ? provider.generationEndpoint : provider.editEndpoint,
    providerLabel: activeProvider?.name || provider.generationEndpoint || provider.editEndpoint || fallbackProviderLabel,
    model: provider.modelId,
    modelLabel: activeModel?.name || provider.modelId,
    payload,
    warnings,
    attachments: summarizeAttachments(targetImage, referenceImages, mask),
    params: {
      n: params.n,
      sizeMode: params.sizeMode,
      sizePreset: params.sizePreset,
      width: params.width,
      height: params.height,
      quality: params.quality,
      background: params.background,
      moderation: params.moderation,
      outputFormat: params.outputFormat,
      outputCompression: params.outputCompression,
      stream: params.stream,
      partialImages: params.partialImages,
      inputFidelity: params.inputFidelity,
      style: params.style,
      retryAttempts: params.retryAttempts,
      retryDelaySeconds: params.retryDelaySeconds
    }
  };
}

function attachSnapshot(images: GeneratedImage[], snapshot: GenerationRequestSnapshot, taskId: string): GeneratedImage[] {
  return images.map((image) => ({ ...image, taskId, request: snapshot }));
}

function attachBatchSnapshot(images: GeneratedImage[], snapshot: GenerationRequestSnapshot, taskId: string, itemId: string, itemIndex: number, startIndex: number): GeneratedImage[] {
  return images.map((image, offset) => ({
    ...image,
    index: startIndex + offset,
    taskId,
    batchItemId: itemId,
    batchItemIndex: itemIndex,
    request: snapshot
  }));
}

function getStatusText(task: GenerationTask | null, t: (key: string, vars?: Record<string, string | number | boolean | null | undefined>) => string) {
  if (!task) return null;
  if (task.kind === 'batch') {
    if (task.status === 'queued') return t('app.status.batchQueued');
    if (task.status === 'streaming') return t('app.status.batchRunning', { done: task.images.length, total: expectedImageCount(task) });
    if (task.status === 'failed') return t('app.status.failed', { error: task.error || t('app.errorUnknown') });
    return t('app.status.batchDone', { count: task.images.length });
  }
  if (task.status === 'queued') return t('app.status.queued');
  if (task.status === 'streaming') return t('app.status.streaming', { count: task.images.length });
  if (task.status === 'failed') return t('app.status.failed', { error: task.error || t('app.errorUnknown') });
  return t('app.status.done', { count: task.images.length });
}

function expectedImageCount(task: GenerationTask): number {
  if (task.batch) {
    return task.batch.items.reduce((sum, item) => sum + Math.max(1, Number(item.request.payload.n ?? item.request.params.n ?? 1)), 0);
  }
  return Math.max(1, Number(task.request.payload.n ?? task.request.params.n ?? 1));
}

function normalizeSelectedModel(settings: StudioSettings): StudioSettings {
  if (settings.models.some((model) => model.id === settings.selectedModelId)) return settings;
  return { ...settings, selectedModelId: settings.models[0]?.id ?? '' };
}

function patchBatchItem(task: GenerationTask, itemId: string, recipe: (item: BatchGenerationItem) => BatchGenerationItem): GenerationTask {
  if (!task.batch) return task;
  return {
    ...task,
    batch: {
      ...task.batch,
      items: task.batch.items.map((item) => item.id === itemId ? recipe(item) : item)
    }
  };
}

async function runWithRetries<T>(args: {
  attempts: number;
  delaySeconds: number;
  run: () => Promise<T>;
  onRetry?: (attempt: number, totalAttempts: number, error: string, delayMs: number) => void;
  signal?: AbortSignal;
}): Promise<T> {
  const extraAttempts = Math.max(0, Math.min(10, Math.round(args.attempts || 0)));
  const delayMs = Math.max(0, Math.min(600, Number(args.delaySeconds || 0))) * 1000;
  const totalAttempts = extraAttempts + 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    if (args.signal?.aborted) throw new DOMException('Request was cancelled.', 'AbortError');
    try {
      return await args.run();
    } catch (error) {
      lastError = error;
      if (isAbortError(error) || args.signal?.aborted) throw error;
      if (attempt >= totalAttempts) break;
      const message = error instanceof Error ? error.message : String(error);
      args.onRetry?.(attempt + 1, totalAttempts, message, delayMs);
      if (delayMs > 0) await delay(delayMs, args.signal);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError ?? 'Unknown error'));
}

export function App() {
  const { t } = useI18n();
  const [mode, setMode] = useState<WorkMode>('generate');
  const [studioSettings, setStudioSettings] = useState<StudioSettings>(() => normalizeSelectedModel(loadStudioSettings()));
  const [params, setParams] = useState<ImageParams>(() => loadImageParams());
  const [parametersOpen, setParametersOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<'images' | 'info' | 'settings'>('images');
  const [targetImage, setTargetImage] = useState<File | null>(null);
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [mask, setMask] = useState<File | null>(null);
  const [tasks, setTasks] = useState<GenerationTask[]>(() => loadGenerationTasks());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);
  const [probingProviderId, setProbingProviderId] = useState<string | null>(null);
  const [quickCheckingProviderId, setQuickCheckingProviderId] = useState<string | null>(null);
  const [quickCheckResults, setQuickCheckResults] = useState<Record<string, ProviderQuickCheckResult>>({});
  const [batchComposerOpen, setBatchComposerOpen] = useState(false);
  const [batchDrafts, setBatchDrafts] = useState<BatchComposerDraft[]>([]);
  const [batchIntervalSeconds, setBatchIntervalSeconds] = useState(4);
  const [batchParametersDraftId, setBatchParametersDraftId] = useState<string | null>(null);
  const taskAbortersRef = useRef(new Map<string, AbortController>());
  const historyHydratedRef = useRef(false);

  const activeModel = useMemo(() => getActiveModel(studioSettings), [studioSettings]);
  const activeProvider = useMemo(() => getProviderForModel(studioSettings, activeModel), [studioSettings, activeModel]);
  const provider = useMemo(() => getEffectiveProviderSettings(studioSettings), [studioSettings]);
  const [capabilityReport, setCapabilityReport] = useState<ProviderProbeReport | null>(() => loadProviderProbeReport(getEffectiveProviderSettings(loadStudioSettings())));

  useEffect(() => saveStudioSettings(studioSettings), [studioSettings]);
  useEffect(() => {
    document.documentElement.dataset.studioTheme = studioSettings.interfaceTheme;
  }, [studioSettings.interfaceTheme]);
  useEffect(() => saveImageParams(params), [params]);
  useEffect(() => {
    let cancelled = false;
    void loadGenerationTasksFromDatabase().then((persistedTasks) => {
      if (cancelled) return;
      historyHydratedRef.current = true;
      setTasks((current) => taskAbortersRef.current.size > 0 ? current : persistedTasks);
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!historyHydratedRef.current) return;
    void saveGenerationTasks(tasks);
  }, [tasks]);
  useEffect(() => {
    setCapabilityReport(loadProviderProbeReport(provider));
    setProbeError(null);
  }, [provider]);

  const { payload, rawJsonError } = useMemo(() => {
    try {
      return { payload: buildImagePayload(params, provider, mode), rawJsonError: null as string | null };
    } catch (e) {
      return { payload: { prompt: params.prompt }, rawJsonError: e instanceof Error ? e.message : String(e) };
    }
  }, [params, provider, mode]);

  const warnings = useMemo(() => {
    const payloadWarnings = explainPayloadWarnings(payload, provider, mode, capabilityReport);
    if (params.sizeMode === 'custom') payloadWarnings.push(...validateCustomSize(params.width, params.height));
    if (mode === 'edit' && !targetImage) payloadWarnings.push(t('app.warningEditNeedsTarget'));
    if (!activeModel) payloadWarnings.push(t('app.warningNoModel'));
    return payloadWarnings;
  }, [payload, provider, params.sizeMode, params.width, params.height, mode, capabilityReport, targetImage, activeModel, t]);

  const canSubmit = !busy && Boolean(activeModel) && !rawJsonError && params.prompt.trim().length > 0 && (mode === 'generate' || Boolean(targetImage));
  const selectedTask = selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null;
  const selectedImage = selectedTask && selectedImageId ? selectedTask.images.find((image) => image.id === selectedImageId) ?? null : null;
  const currentTask = tasks[0] ?? null;
  const activeBatchDraft = batchParametersDraftId ? batchDrafts.find((draft) => draft.id === batchParametersDraftId) ?? null : null;

  const patchParams = (patch: Partial<ImageParams>) => setParams((prev) => ({ ...prev, ...patch }));

  const updateTask = (taskId: string, recipe: (task: GenerationTask) => GenerationTask) => {
    setTasks((prev) => prev.map((task) => task.id === taskId ? recipe(task) : task));
  };

  const deleteTask = (taskId: string) => {
    const controller = taskAbortersRef.current.get(taskId);
    controller?.abort();
    taskAbortersRef.current.delete(taskId);
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
      setSelectedImageId(null);
    }
  };

  const clearTasks = () => {
    taskAbortersRef.current.forEach((controller) => controller.abort());
    taskAbortersRef.current.clear();
    setTasks([]);
    setSelectedTaskId(null);
    setSelectedImageId(null);
    void clearGenerationTasksDatabase();
  };

  const makeDraft = (source?: Partial<BatchComposerDraft>): BatchComposerDraft => ({
    id: crypto.randomUUID(),
    mode: source?.mode ?? 'generate',
    params: cloneParams(source?.params ?? params),
    selectedModelId: source?.selectedModelId ?? studioSettings.selectedModelId,
    targetImage: source?.targetImage ?? null,
    referenceImages: [...(source?.referenceImages ?? [])],
    mask: source?.mask ?? null
  });

  const openBatchComposer = () => {
    setBatchDrafts((current) => current.length > 0 ? current : [makeDraft({ mode, params, selectedModelId: studioSettings.selectedModelId, targetImage, referenceImages, mask })]);
    setBatchComposerOpen(true);
    setWorkspaceTab('images');
  };

  const patchBatchDraft = (id: string, patch: Partial<BatchComposerDraft>) => {
    setBatchDrafts((prev) => prev.map((draft) => draft.id === id ? { ...draft, ...patch } : draft));
  };

  const patchBatchDraftParams = (id: string, nextParams: ImageParams) => {
    setBatchDrafts((prev) => prev.map((draft) => draft.id === id ? { ...draft, params: nextParams } : draft));
  };

  const batchCanSubmit = useMemo(() => {
    if (busy || batchDrafts.length === 0) return false;
    return batchDrafts.some((draft) => {
      const { model, provider: draftProvider } = providerContextForModel(studioSettings, draft.selectedModelId);
      if (!model) return false;
      if (!draft.params.prompt.trim()) return false;
      if (draft.mode === 'edit' && !draft.targetImage) return false;
      try {
        buildImagePayload(draft.params, draftProvider, draft.mode);
        return true;
      } catch {
        return false;
      }
    });
  }, [busy, batchDrafts, studioSettings]);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);

    const taskId = crypto.randomUUID();
    const controller = new AbortController();
    taskAbortersRef.current.set(taskId, controller);
    const snapshot = captureRequestSnapshot({ mode, params, provider, activeProvider, activeModel, payload, warnings, targetImage, referenceImages, mask, fallbackProviderLabel: t('app.localProvider') });
    const task: GenerationTask = {
      id: taskId,
      kind: 'single',
      status: 'queued',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      request: snapshot,
      images: []
    };

    setTasks((prev) => [task, ...prev]);

    try {
      const result = await runWithRetries({
        attempts: params.retryAttempts,
        delaySeconds: params.retryDelaySeconds,
        run: () => submitImageRequest({
          provider,
          payload,
          mode,
          targetImage,
          referenceImages,
          mask,
          signal: controller.signal,
          onStreamImage: (image) => {
            const attached = { ...image, taskId, request: snapshot };
            updateTask(taskId, (current) => ({
              ...current,
              status: 'streaming',
              updatedAt: Date.now(),
              images: [...current.images, attached]
            }));
          }
        }),
        onRetry: (attempt, total, error, waitMs) => {
          updateTask(taskId, (current) => ({
            ...current,
            status: 'queued',
            updatedAt: Date.now(),
            error: t('app.retryWaiting', { attempt, total, seconds: Math.round(waitMs / 1000), error })
          }));
        },
        signal: controller.signal
      });

      const finalImages = payload.stream === true
        ? undefined
        : attachSnapshot(result.images, snapshot, taskId);

      updateTask(taskId, (current) => ({
        ...current,
        status: 'succeeded',
        updatedAt: Date.now(),
        images: finalImages ?? current.images,
        raw: result.raw,
        error: null
      }));
    } catch (e) {
      updateTask(taskId, (current) => ({
        ...current,
        status: 'failed',
        updatedAt: Date.now(),
        error: isAbortError(e) ? t('app.cancelled') : e instanceof Error ? e.message : String(e)
      }));
    } finally {
      taskAbortersRef.current.delete(taskId);
      setBusy(false);
    }
  };

  const submitBatch = async () => {
    if (!batchCanSubmit) return;

    const prepared = batchDrafts.flatMap((draft, index) => {
      const { model, generationProvider, provider: itemProvider } = providerContextForModel(studioSettings, draft.selectedModelId);
      if (!model) return [];
      if (!draft.params.prompt.trim()) return [];
      if (draft.mode === 'edit' && !draft.targetImage) return [];
      try {
        const itemPayload = buildImagePayload(draft.params, itemProvider, draft.mode);
        const itemWarnings = explainPayloadWarnings(itemPayload, itemProvider, draft.mode, draft.selectedModelId === studioSettings.selectedModelId ? capabilityReport : null);
        if (draft.params.sizeMode === 'custom') itemWarnings.push(...validateCustomSize(draft.params.width, draft.params.height));
        const snapshot = captureRequestSnapshot({
          mode: draft.mode,
          params: draft.params,
          provider: itemProvider,
          activeProvider: generationProvider,
          activeModel: model,
          payload: itemPayload,
          warnings: itemWarnings,
          targetImage: draft.targetImage,
          referenceImages: draft.referenceImages,
          mask: draft.mask,
          fallbackProviderLabel: t('app.localProvider')
        });
        return [{ draft, index, provider: itemProvider, payload: itemPayload, snapshot }];
      } catch {
        return [];
      }
    });

    if (prepared.length === 0) return;

    setBusy(true);
    setBatchComposerOpen(false);

    const taskId = crypto.randomUUID();
    const controller = new AbortController();
    taskAbortersRef.current.set(taskId, controller);
    const intervalMs = Math.max(0, Math.round(batchIntervalSeconds * 1000));
    const taskCreatedAt = Date.now();
    const batchItems: BatchGenerationItem[] = prepared.map((item, index) => ({
      id: crypto.randomUUID(),
      index,
      status: 'queued' as GenerationStatus,
      request: item.snapshot,
      images: []
    }));

    const aggregatePayload = {
      type: 'multi_generation',
      intervalMs,
      intervalMode: 'between_sends',
      requests: prepared.map((item) => item.snapshot.payload)
    };

    const aggregateSnapshot: GenerationRequestSnapshot = {
      createdAt: taskCreatedAt,
      mode: prepared[0].snapshot.mode,
      prompt: t('batch.aggregatePrompt', { count: prepared.length }),
      endpoint: 'multi',
      providerLabel: t('batch.multiProviderLabel'),
      model: prepared.map((item) => item.snapshot.model).filter(Boolean).join(', '),
      modelLabel: prepared.map((item) => item.snapshot.modelLabel).filter(Boolean).join(', '),
      payload: aggregatePayload,
      warnings: prepared.flatMap((item) => item.snapshot.warnings),
      attachments: prepared.flatMap((item) => item.snapshot.attachments),
      params: prepared[0].snapshot.params
    };

    const task: GenerationTask = {
      id: taskId,
      kind: 'batch',
      status: 'queued',
      createdAt: taskCreatedAt,
      updatedAt: taskCreatedAt,
      request: aggregateSnapshot,
      images: [],
      batch: {
        intervalMs,
        items: batchItems
      }
    };

    setTasks((prev) => [task, ...prev]);

    let globalImageIndex = 0;
    const errorsByIndex: Array<string | null> = Array(prepared.length).fill(null);
    const getErrorText = () => errorsByIndex.filter(Boolean).join('\n');
    const reserveImageIndexes = (count: number) => {
      const start = globalImageIndex;
      globalImageIndex += count;
      return start;
    };

    const runBatchItem = async (preparedItem: typeof prepared[number], batchItem: BatchGenerationItem, itemIndex: number) => {
      updateTask(taskId, (current) => ({
        ...patchBatchItem(current, batchItem.id, (item) => ({ ...item, status: 'streaming', error: null })),
        status: 'streaming',
        updatedAt: Date.now()
      }));

      try {
        const result = await runWithRetries({
          attempts: preparedItem.draft.params.retryAttempts,
          delaySeconds: preparedItem.draft.params.retryDelaySeconds,
          run: () => submitImageRequest({
            provider: preparedItem.provider,
            payload: preparedItem.payload,
            mode: preparedItem.draft.mode,
            targetImage: preparedItem.draft.targetImage,
            referenceImages: preparedItem.draft.referenceImages,
            mask: preparedItem.draft.mask,
            signal: controller.signal,
            onStreamImage: (image) => {
              const attached = attachBatchSnapshot([image], preparedItem.snapshot, taskId, batchItem.id, itemIndex, reserveImageIndexes(1))[0];
              updateTask(taskId, (current) => ({
                ...patchBatchItem(current, batchItem.id, (item) => ({ ...item, status: 'streaming', images: [...item.images, attached] })),
                status: 'streaming',
                updatedAt: Date.now(),
                images: [...current.images, attached]
              }));
            }
          }),
          onRetry: (attempt, total, error, waitMs) => {
            const retryText = t('app.retryWaiting', { attempt, total, seconds: Math.round(waitMs / 1000), error });
            updateTask(taskId, (current) => ({
              ...patchBatchItem(current, batchItem.id, (item) => ({ ...item, status: 'queued', error: retryText })),
              status: 'streaming',
              updatedAt: Date.now(),
              error: getErrorText()
            }));
          },
          signal: controller.signal
        });

        const finalImages = preparedItem.payload.stream === true
          ? []
          : attachBatchSnapshot(result.images, preparedItem.snapshot, taskId, batchItem.id, itemIndex, reserveImageIndexes(result.images.length));

        updateTask(taskId, (current) => ({
          ...patchBatchItem(current, batchItem.id, (item) => ({
            ...item,
            status: 'succeeded',
            updatedAt: Date.now(),
            images: preparedItem.payload.stream === true ? item.images : finalImages,
            raw: result.raw,
            error: null
          })),
          status: 'streaming',
          updatedAt: Date.now(),
          images: preparedItem.payload.stream === true ? current.images : [...current.images, ...finalImages]
        }));
      } catch (e) {
        const message = isAbortError(e) ? t('app.cancelled') : e instanceof Error ? e.message : String(e);
        errorsByIndex[itemIndex] = t('batch.itemError', { index: itemIndex + 1, error: message });
        updateTask(taskId, (current) => ({
          ...patchBatchItem(current, batchItem.id, (item) => ({ ...item, status: 'failed', error: message })),
          status: 'streaming',
          updatedAt: Date.now(),
          error: getErrorText()
        }));
      }
    };

    try {
      const scheduledRuns = prepared.map(async (preparedItem, i) => {
        if (i > 0 && intervalMs > 0) await delay(intervalMs * i, controller.signal);
        if (controller.signal.aborted) throw new DOMException('Request was cancelled.', 'AbortError');
        await runBatchItem(preparedItem, batchItems[i], i);
      });

      await Promise.all(scheduledRuns);

      updateTask(taskId, (current) => {
        const errorText = getErrorText();
        const finalStatus: GenerationStatus = current.images.length > 0 || !errorText ? 'succeeded' : 'failed';
        return {
          ...current,
          status: finalStatus,
          updatedAt: Date.now(),
          error: errorText || null
        };
      });
    } catch (e) {
      updateTask(taskId, (current) => ({
        ...current,
        status: 'failed',
        updatedAt: Date.now(),
        error: isAbortError(e) ? t('app.cancelled') : e instanceof Error ? e.message : String(e)
      }));
    } finally {
      taskAbortersRef.current.delete(taskId);
      setBusy(false);
    }
  };

  const runProbeForProvider = async (generationProvider: GenerationProvider, model: GenerationModel | null) => {
    setProbingProviderId(generationProvider.id);
    setProbeError(null);
    try {
      const effective = toProviderSettings(generationProvider, model);
      const report = await probeProvider(effective);
      saveProviderProbeReport(report);
      if (generationProvider.id === activeProvider?.id && model?.id === activeModel?.id) setCapabilityReport(report);
    } catch (e) {
      setProbeError(e instanceof Error ? e.message : String(e));
    } finally {
      setProbingProviderId(null);
    }
  };

  const runQuickCheckForProvider = async (generationProvider: GenerationProvider, model: GenerationModel | null) => {
    setQuickCheckingProviderId(generationProvider.id);
    try {
      const result = await quickCheckProvider(toProviderSettings(generationProvider, model));
      setQuickCheckResults((prev) => ({ ...prev, [generationProvider.id]: result }));
    } catch (e) {
      setQuickCheckResults((prev) => ({
        ...prev,
        [generationProvider.id]: { ok: false, status: null, message: e instanceof Error ? e.message : String(e), createdAt: Date.now() }
      }));
    } finally {
      setQuickCheckingProviderId(null);
    }
  };

  const clearProbeCacheForProvider = (generationProvider: GenerationProvider, model: GenerationModel | null) => {
    clearProviderProbeReport(toProviderSettings(generationProvider, model));
    if (generationProvider.id === activeProvider?.id && model?.id === activeModel?.id) setCapabilityReport(null);
    setProbeError(null);
  };

  const restoreRequestToWorkspace = (snapshot: GenerationRequestSnapshot) => {
    const sent = snapshot.payload;
    setMode(snapshot.mode);
    setBatchComposerOpen(false);
    setParams((prev) => ({
      ...prev,
      prompt: snapshot.prompt,
      n: snapshot.params.n,
      sizeMode: snapshot.params.sizeMode,
      sizePreset: snapshot.params.sizePreset,
      width: snapshot.params.width,
      height: snapshot.params.height,
      quality: snapshot.params.quality,
      background: snapshot.params.background,
      moderation: snapshot.params.moderation,
      outputFormat: snapshot.params.outputFormat,
      outputCompression: snapshot.params.outputCompression,
      stream: snapshot.params.stream,
      partialImages: snapshot.params.partialImages,
      inputFidelity: snapshot.params.inputFidelity,
      style: snapshot.params.style,
      retryAttempts: snapshot.params.retryAttempts ?? 0,
      retryDelaySeconds: snapshot.params.retryDelaySeconds ?? 4,
      includeModel: 'model' in sent,
      includeN: 'n' in sent,
      includeQuality: 'quality' in sent,
      includeBackground: 'background' in sent,
      includeModeration: 'moderation' in sent,
      includeOutputFormat: 'output_format' in sent,
      includeOutputCompression: 'output_compression' in sent,
      includeStream: 'stream' in sent,
      includePartialImages: 'partial_images' in sent,
      includeResponseFormat: 'response_format' in sent,
      includeInputFidelity: 'input_fidelity' in sent,
      includeUser: 'user' in sent,
      includeStyle: 'style' in sent
    }));

    const modelFromHistory = studioSettings.models.find((model) => model.modelId === snapshot.model || model.name === snapshot.modelLabel);
    if (modelFromHistory) {
      setStudioSettings((prev) => ({ ...prev, selectedModelId: modelFromHistory.id }));
    }

    setSelectedTaskId(null);
    setSelectedImageId(null);
  };

  const batchWarnings = useMemo(() => {
    if (!activeBatchDraft) return [];
    const { provider: draftProvider } = providerContextForModel(studioSettings, activeBatchDraft.selectedModelId);
    try {
      const draftPayload = buildImagePayload(activeBatchDraft.params, draftProvider, activeBatchDraft.mode);
      const draftWarnings = explainPayloadWarnings(draftPayload, draftProvider, activeBatchDraft.mode, activeBatchDraft.selectedModelId === studioSettings.selectedModelId ? capabilityReport : null);
      if (activeBatchDraft.params.sizeMode === 'custom') draftWarnings.push(...validateCustomSize(activeBatchDraft.params.width, activeBatchDraft.params.height));
      if (activeBatchDraft.mode === 'edit' && !activeBatchDraft.targetImage) draftWarnings.push(t('app.warningEditNeedsTarget'));
      return draftWarnings;
    } catch (e) {
      return [e instanceof Error ? e.message : String(e)];
    }
  }, [activeBatchDraft, studioSettings, capabilityReport, t]);

  if (selectedTask) {
    return (
      <ImageDetailPage
        task={selectedTask}
        image={selectedImage}
        onBack={() => { setSelectedTaskId(null); setSelectedImageId(null); }}
        onSelectImage={(image) => setSelectedImageId(image.id)}
        onRestoreRequest={restoreRequestToWorkspace}
      />
    );
  }

  return (
    <main className={`studio-app ${sidebarCollapsed ? 'sidebar-is-collapsed' : ''} ${batchComposerOpen ? 'batch-composer-is-open' : ''}`} data-theme={studioSettings.interfaceTheme}>
      <div className="studio-noise" aria-hidden="true" />
      <StudioSidebar
        collapsed={sidebarCollapsed}
        activeTab={workspaceTab}
        onTabChange={setWorkspaceTab}
        onCollapseChange={setSidebarCollapsed}
      />

      <section className="studio-main">
        {workspaceTab === 'images' && !batchComposerOpen && (
          <ResultsGallery
            tasks={tasks}
            busy={busy}
            onClearResults={clearTasks}
            onDeleteTask={deleteTask}
            onOpenTask={(task, image) => {
              setSelectedTaskId(task.id);
              setSelectedImageId(image?.id ?? null);
            }}
          />
        )}
        {workspaceTab === 'images' && batchComposerOpen && (
          <MultiImageComposer
            drafts={batchDrafts}
            intervalSeconds={batchIntervalSeconds}
            busy={busy}
            canSubmit={batchCanSubmit}
            models={studioSettings.models}
            providers={studioSettings.providers}
            onIntervalSecondsChange={setBatchIntervalSeconds}
            onDraftChange={patchBatchDraft}
            onDraftParamsChange={patchBatchDraftParams}
            onAddDraft={() => setBatchDrafts((prev) => [...prev, makeDraft({ params: prev[prev.length - 1]?.params ?? params, selectedModelId: prev[prev.length - 1]?.selectedModelId ?? studioSettings.selectedModelId })])}
            onDuplicateDraft={(id) => setBatchDrafts((prev) => {
              const source = prev.find((draft) => draft.id === id);
              return source ? [...prev, makeDraft(source)] : prev;
            })}
            onRemoveDraft={(id) => setBatchDrafts((prev) => prev.length > 1 ? prev.filter((draft) => draft.id !== id) : prev)}
            onOpenParameters={setBatchParametersDraftId}
            onSubmit={submitBatch}
            onCancel={() => setBatchComposerOpen(false)}
          />
        )}
        {workspaceTab === 'info' && (
          <StudioInfoPage
            mode={mode}
            provider={provider}
            capabilityReport={capabilityReport}
            onOpenSettings={() => setWorkspaceTab('settings')}
          />
        )}
        {workspaceTab === 'settings' && (
          <SettingsPage
            settings={studioSettings}
            report={capabilityReport}
            probingProviderId={probingProviderId}
            quickCheckingProviderId={quickCheckingProviderId}
            quickCheckResults={quickCheckResults}
            probeError={probeError}
            onSave={(next) => setStudioSettings(normalizeSelectedModel(next))}
            onSelectModel={(modelId) => setStudioSettings((prev) => ({ ...prev, selectedModelId: modelId }))}
            onProbeProvider={runProbeForProvider}
            onQuickCheckProvider={runQuickCheckForProvider}
            onClearCache={clearProbeCacheForProvider}
          />
        )}
      </section>

      {workspaceTab === 'images' && !batchComposerOpen && <ImageComposer
        mode={mode}
        prompt={params.prompt}
        busy={busy}
        canSubmit={canSubmit}
        targetImage={targetImage}
        referenceImages={referenceImages}
        mask={mask}
        models={studioSettings.models}
        providers={studioSettings.providers}
        selectedModelId={studioSettings.selectedModelId}
        statusText={rawJsonError || getStatusText(currentTask, t)}
        onModeChange={setMode}
        onModelChange={(modelId) => setStudioSettings((prev) => ({ ...prev, selectedModelId: modelId }))}
        onPromptChange={(prompt) => patchParams({ prompt })}
        onSubmit={submit}
        onOpenParameters={() => setParametersOpen(true)}
        onOpenBatchComposer={openBatchComposer}
        onTargetImageChange={(file) => { setTargetImage(file); if (file) setMode('edit'); }}
        onReferenceImagesChange={(files) => { setReferenceImages(files); if (files.length > 0) setMode('edit'); }}
        onMaskChange={(file) => { setMask(file); if (file) setMode('edit'); }}
      />}

      <ParametersModal
        open={parametersOpen}
        mode={mode}
        params={params}
        capabilityReport={capabilityReport}
        warnings={warnings}
        onClose={() => setParametersOpen(false)}
        onChange={setParams}
      />

      {activeBatchDraft && (
        <ParametersModal
          open={Boolean(activeBatchDraft)}
          mode={activeBatchDraft.mode}
          params={activeBatchDraft.params}
          capabilityReport={activeBatchDraft.selectedModelId === studioSettings.selectedModelId ? capabilityReport : null}
          warnings={batchWarnings}
          onClose={() => setBatchParametersDraftId(null)}
          onChange={(next) => patchBatchDraftParams(activeBatchDraft.id, next)}
        />
      )}
    </main>
  );
}
