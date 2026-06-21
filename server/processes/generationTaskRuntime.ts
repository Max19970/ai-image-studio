import type express from 'express';
import { isAbortError } from '../../src/domain/asyncFlow';
import { addGalleryPath, mapGallerySubPath, normalizeGalleryPath, normalizeGalleryPaths, removeGalleryPath } from '../../src/domain/galleryFilesystem';
import { attachSnapshot } from '../../src/domain/generationSnapshots';
import type { BatchGenerationItem, GeneratedImage, GenerationProgress, GenerationRequestSnapshot, GenerationStatus, GenerationTask } from '../../src/domain/generationTask';
import { normalizeGenerationTasks } from '../../src/entities/storage';
import type { ProviderResponseAdapter } from '../../src/entities/provider/types';
import { comfyUiResponseAdapter } from '../../src/providers/comfyui/responseAdapter';
import { openAiCompatibleResponseAdapter } from '../../src/providers/openai-compatible/responseAdapter';
import { reduceBatchTask, type BatchTaskReducerEvent } from '../../src/processes/batch-runner/batchTaskReducer';
import { runDelayedParallelScheduler } from '../../src/processes/generation-task-lifecycle/scheduler';
import { createRunnerRetryPolicy, runWithRetryPolicy } from '../../src/processes/generation-task-lifecycle/retryPolicy';
import { loadGenerationTaskHistoryDocuments, saveGenerationTaskHistoryDocuments } from '../storage/generationTaskStore';
import { getProviderAdapter } from '../providers/registry';
import type {
  ProviderPreviewStreamMode,
  ProviderSettings,
  ProviderSubmitTransportDefinition,
  UploadedFile
} from '../providers/types';

type Client = express.Response;

export interface ServerGenerationRunInput {
  provider: ProviderSettings;
  payload: Record<string, unknown>;
  providerModeId?: string | null;
  transport?: ProviderSubmitTransportDefinition | null;
  files: UploadedFile[];
  snapshot: GenerationRequestSnapshot;
  previewStreamMode?: ProviderPreviewStreamMode;
  retryAttempts?: number;
  retryDelaySeconds?: number;
  galleryPath?: string;
}

export interface ServerBatchGenerationRunInput {
  items: ServerGenerationRunInput[];
  intervalMs: number;
  aggregateSnapshot?: GenerationRequestSnapshot | null;
  galleryPath?: string;
}

let runtimeTasks: GenerationTask[] | null = null;
let mutationQueue: Promise<void> = Promise.resolve();
const clients = new Set<Client>();
const taskControllers = new Map<string, AbortController>();

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function getResponseAdapter(adapterId: string | undefined): ProviderResponseAdapter {
  return adapterId === 'comfyui' ? comfyUiResponseAdapter : openAiCompatibleResponseAdapter;
}

function isStreamedRun(input: ServerGenerationRunInput): boolean {
  return input.provider.adapterId === 'comfyui' || input.payload.stream === true;
}

function normalizeError(error: unknown): string {
  if (isAbortError(error)) return 'Request was cancelled.';
  if (error instanceof Error) return error.message;
  return String(error || 'Generation failed.');
}

function sortImages(images: GeneratedImage[]) {
  return [...images].sort((a, b) => a.index - b.index || a.createdAt - b.createdAt);
}

function sameLiveImageSlot(left: GeneratedImage, right: GeneratedImage): boolean {
  return (left.batchItemId ?? null) === (right.batchItemId ?? null) && left.index === right.index;
}

function upsertLiveImage(current: GeneratedImage[], next: GeneratedImage): GeneratedImage[] {
  if (next.kind === 'partial') {
    return sortImages([...current.filter((image) => image.kind !== 'partial' || (image.batchItemId ?? null) !== (next.batchItemId ?? null)), next]);
  }
  return sortImages([...current.filter((image) => image.kind !== 'partial' || !sameLiveImageSlot(image, next)), next]);
}

function finalImages(images: GeneratedImage[]): GeneratedImage[] {
  return images.filter((image) => image.kind === 'final');
}

function taskPersistableFinalImageCount(task: GenerationTask): number {
  const direct = task.images.filter((image) => image.kind === 'final' && Boolean(image.src || image.storageAssetKey)).length;
  const batch = task.batch?.items.reduce((total, item) => total + item.images.filter((image) => image.kind === 'final' && Boolean(image.src || image.storageAssetKey)).length, 0) ?? 0;
  return direct + batch;
}

function isEmptyActiveTask(task: GenerationTask): boolean {
  if (taskPersistableFinalImageCount(task) > 0) return false;
  return isActiveStatus(task.status);
}

function runtimePersistableTasks(tasks: GenerationTask[]): GenerationTask[] {
  return tasks.filter((task) => !isEmptyActiveTask(task));
}

function persistRuntimeTasks(tasks: GenerationTask[]) {
  saveGenerationTaskHistoryDocuments(runtimePersistableTasks(tasks));
}

function ensureRuntimeTasks(): GenerationTask[] {
  if (!runtimeTasks) {
    const { tasks } = loadGenerationTaskHistoryDocuments({ limit: 120, offset: 0, assetMode: 'full' });
    runtimeTasks = normalizeGenerationTasks(tasks, 120);
  }
  return runtimeTasks;
}

function isActiveStatus(status: GenerationStatus): boolean {
  return status === 'queued' || status === 'sending' || status === 'running' || status === 'retrying';
}

function clientSnapshotTasks(): GenerationTask[] {
  const { tasks } = loadGenerationTaskHistoryDocuments({ limit: 120, offset: 0, assetMode: 'thumbnail' });
  if (!runtimeTasks) return normalizeGenerationTasks(tasks, 120);

  const storedById = new Map((tasks as GenerationTask[]).map((task) => [task.id, task]));
  return runtimeTasks.map((task) => {
    if (isActiveStatus(task.status)) return task;
    return storedById.get(task.id) ?? task;
  });
}

interface GenerationTasksDeltaEvent {
  revision: number;
  taskIds: string[];
  upserted: GenerationTask[];
  deletedIds: string[];
}

let taskEventsRevision = 0;

function imageDeltaSignature(image: GeneratedImage): string {
  return [
    image.id,
    image.kind,
    image.index,
    image.batchItemId ?? '',
    image.batchItemIndex ?? '',
    image.storageAssetKey ?? '',
    image.storageThumbnailKey ?? '',
    image.storageAssetLoaded === false ? 'lazy' : 'full',
    image.src?.length ?? 0,
    image.thumbnailSrc?.length ?? 0,
    image.createdAt
  ].join(':');
}

function progressDeltaSignature(progress: GenerationProgress | null | undefined): string {
  if (!progress) return '';
  return [
    progress.providerAdapterId ?? '',
    progress.percent ?? '',
    progress.step ?? '',
    progress.maxSteps ?? '',
    progress.stage ?? '',
    progress.nodeId ?? '',
    progress.message ?? '',
    progress.updatedAt
  ].join(':');
}

function taskDeltaSignature(task: GenerationTask): string {
  return JSON.stringify({
    id: task.id,
    kind: task.kind ?? 'single',
    status: task.status,
    updatedAt: task.updatedAt,
    galleryPath: task.galleryPath ?? '/',
    galleryPaths: task.galleryPaths ?? [task.galleryPath ?? '/'],
    favorite: task.galleryFavorite ?? false,
    error: task.error ?? null,
    progress: progressDeltaSignature(task.progress),
    images: task.images.map(imageDeltaSignature),
    batch: task.batch ? {
      intervalMs: task.batch.intervalMs,
      items: task.batch.items.map((item) => ({
        id: item.id,
        status: item.status,
        error: item.error ?? null,
        progress: progressDeltaSignature(item.progress),
        images: item.images.map(imageDeltaSignature)
      }))
    } : null
  });
}

function createTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number): GenerationTasksDeltaEvent {
  const previousSignatures = new Map(previousTasks.map((task) => [task.id, taskDeltaSignature(task)]));
  const nextIds = new Set(nextTasks.map((task) => task.id));
  const deletedIds = previousTasks.flatMap((task) => nextIds.has(task.id) ? [] : [task.id]);
  const upserted = nextTasks.filter((task) => previousSignatures.get(task.id) !== taskDeltaSignature(task));
  return {
    revision,
    taskIds: nextTasks.map((task) => task.id),
    upserted,
    deletedIds
  };
}

function sendEvent(client: Client, event: string, data: unknown) {
  client.write(`event: ${event}\n`);
  client.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number) {
  if (clients.size === 0) return;
  const delta = createTasksDelta(previousTasks, nextTasks, revision);
  if (delta.upserted.length === 0 && delta.deletedIds.length === 0) return;
  for (const client of clients) sendEvent(client, 'tasks-delta', delta);
}

async function mutateTasks(recipe: (tasks: GenerationTask[]) => GenerationTask[], options: { persist?: boolean } = {}) {
  mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
    const previousClientTasks = clients.size > 0 ? clientSnapshotTasks() : [];
    runtimeTasks = recipe(ensureRuntimeTasks());
    if (options.persist !== false) persistRuntimeTasks(runtimeTasks);
    const revision = ++taskEventsRevision;
    if (clients.size > 0) broadcastTasksDelta(previousClientTasks, clientSnapshotTasks(), revision);
  });
  await mutationQueue;
}

async function patchTask(taskId: string, recipe: (task: GenerationTask) => GenerationTask, options: { persist?: boolean } = {}) {
  await mutateTasks((tasks) => tasks.map((task) => task.id === taskId ? recipe(task) : task), options);
}

function transitionTask(task: GenerationTask, status: GenerationStatus, patch: Partial<GenerationTask> = {}): GenerationTask {
  return {
    ...task,
    ...patch,
    status,
    updatedAt: Date.now()
  };
}

async function readJsonOrThrow(response: Response): Promise<unknown> {
  const text = await response.text();
  let data: unknown = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Keep raw text for upstream error diagnostics.
  }

  if (!response.ok) {
    const root = data && typeof data === 'object' ? data as any : null;
    const error = root?.error ?? root;
    const message = typeof error === 'string'
      ? error
      : ((error?.message ?? root?.message ?? text) || response.statusText || `HTTP ${response.status}`);
    throw new Error(String(message));
  }

  return data;
}

async function consumeStreamedGeneration(
  taskId: string,
  response: Response,
  responseAdapter: ProviderResponseAdapter,
  snapshot: GenerationRequestSnapshot
): Promise<GeneratedImage[]> {
  if (!response.ok || !response.body) {
    await readJsonOrThrow(response);
    return [];
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const collected: GeneratedImage[] = [];

  const collectBlock = async (block: string) => {
    for (const event of responseAdapter.parseSseBlock(block)) {
      const streamError = responseAdapter.collectErrorFromJson?.(event);
      if (streamError) throw new Error(streamError);

      const progress = responseAdapter.collectProgressFromJson?.(event);
      if (progress) {
        await patchTask(taskId, (task) => transitionTask(task, 'running', { progress }), { persist: false });
      }

      const images = responseAdapter.collectImagesFromJson(event);
      for (const image of images) {
        const attached = attachSnapshot([image], snapshot, taskId)[0];
        if (attached.kind === 'final') collected.push(attached);
        await patchTask(taskId, (task) => transitionTask(task, 'running', {
          images: upsertLiveImage(task.images, attached)
        }), { persist: attached.kind === 'final' });
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) await collectBlock(block);
  }

  if (buffer.trim()) await collectBlock(buffer);
  return collected;
}

async function consumeStreamedBatchItem(args: {
  taskId: string;
  response: Response;
  responseAdapter: ProviderResponseAdapter;
  batchItem: BatchGenerationItem;
  itemIndex: number;
  snapshot: GenerationRequestSnapshot;
  reserveFinalIndex: () => number;
}): Promise<GeneratedImage[]> {
  const { taskId, response, responseAdapter, batchItem, itemIndex, snapshot, reserveFinalIndex } = args;
  if (!response.ok || !response.body) {
    await readJsonOrThrow(response);
    return [];
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const collected: GeneratedImage[] = [];

  const collectBlock = async (block: string) => {
    for (const event of responseAdapter.parseSseBlock(block)) {
      const streamError = responseAdapter.collectErrorFromJson?.(event);
      if (streamError) throw new Error(streamError);

      const progress = responseAdapter.collectProgressFromJson?.(event);
      if (progress) {
        await dispatchBatchEvent(taskId, { type: 'item-progress', itemId: batchItem.id, progress, aggregateError: null }, false);
      }

      const images = responseAdapter.collectImagesFromJson(event);
      for (const image of images) {
        const index = image.kind === 'partial' ? itemIndex * 1000 : reserveFinalIndex();
        const attached = attachBatchImage(image, taskId, batchItem, itemIndex, index, snapshot);
        if (attached.kind === 'final') collected.push(attached);
        await dispatchBatchEvent(taskId, { type: 'item-streamed', itemId: batchItem.id, image: attached }, attached.kind === 'final');
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) await collectBlock(block);
  }

  if (buffer.trim()) await collectBlock(buffer);
  return collected;
}

async function runTask(taskId: string, input: ServerGenerationRunInput, controller: AbortController) {
  const responseAdapter = getResponseAdapter(input.provider.adapterId);
  try {
    await patchTask(taskId, (task) => transitionTask(task, 'sending', { error: null }));
    const { upstream } = await getProviderAdapter(input.provider.adapterId).submitProviderMode({
      provider: input.provider,
      providerModeId: input.providerModeId,
      transport: input.transport,
      payload: input.payload,
      files: input.files,
      context: {
        signal: controller.signal,
        previewStreamMode: input.previewStreamMode
      }
    });

    await patchTask(taskId, (task) => transitionTask(task, 'running', { error: null }));

    if (isStreamedRun(input)) {
      const streamedImages = await consumeStreamedGeneration(taskId, upstream, responseAdapter, input.snapshot);
      await patchTask(taskId, (task) => {
        const images = streamedImages.length > 0 ? sortImages(streamedImages) : sortImages(finalImages(task.images));
        return transitionTask(task, 'succeeded', { images, error: null, progress: null });
      });
      return;
    }

    const raw = await readJsonOrThrow(upstream);
    const images = attachSnapshot(
      responseAdapter.collectImagesFromJson(raw, String(input.payload.output_format ?? 'png')),
      input.snapshot,
      taskId
    );
    await patchTask(taskId, (task) => transitionTask(task, 'succeeded', { images, raw, error: null, progress: null }));
  } catch (error) {
    const cancelled = isAbortError(error) || controller.signal.aborted;
    await patchTask(taskId, (task) => transitionTask(task, cancelled ? 'cancelled' : 'failed', { error: normalizeError(error), progress: null }));
  } finally {
    taskControllers.delete(taskId);
  }
}

function createBatchAggregateSnapshot(input: ServerBatchGenerationRunInput, createdAt: number): GenerationRequestSnapshot {
  if (input.aggregateSnapshot) return input.aggregateSnapshot;
  const first = input.items[0]?.snapshot;
  return {
    createdAt,
    mode: first?.mode ?? 'generate',
    prompt: `Batch request · ${input.items.length} item${input.items.length === 1 ? '' : 's'}`,
    endpoint: 'server:batch',
    providerLabel: 'Mixed providers',
    providerAdapterId: 'server-batch',
    model: 'batch',
    modelLabel: 'Batch',
    payload: {},
    warnings: [],
    attachments: [],
    params: {},
    aggregate: {
      kind: 'batch',
      itemCount: input.items.length,
      intervalMs: input.intervalMs
    }
  };
}

function createBatchTask(input: ServerBatchGenerationRunInput): GenerationTask {
  const createdAt = Date.now();
  const taskId = uid('task');
  const items: BatchGenerationItem[] = input.items.map((item, index) => ({
    id: uid('batch-item'),
    index,
    status: 'queued',
    request: item.snapshot,
    images: []
  }));
  return {
    id: taskId,
    kind: 'batch',
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    galleryPath: normalizeGalleryPath(input.galleryPath),
    galleryPaths: normalizeGalleryPaths(undefined, input.galleryPath),
    request: createBatchAggregateSnapshot(input, createdAt),
    images: [],
    batch: {
      intervalMs: input.intervalMs,
      items
    },
    error: null
  };
}

function batchTerminal(task: GenerationTask): { status: GenerationStatus; error: string | null } {
  const items = task.batch?.items ?? [];
  if (items.some((item) => isActiveStatus(item.status))) return { status: 'running', error: task.error ?? null };
  const succeeded = items.filter((item) => item.status === 'succeeded').length;
  const failed = items.filter((item) => item.status === 'failed').length;
  const cancelled = items.filter((item) => item.status === 'cancelled').length;
  if (succeeded > 0) return { status: 'succeeded', error: failed + cancelled > 0 ? `${failed + cancelled} batch item${failed + cancelled === 1 ? '' : 's'} did not complete.` : null };
  if (cancelled > 0 && failed === 0) return { status: 'cancelled', error: 'Batch request was cancelled.' };
  return { status: 'failed', error: failed > 0 ? 'All batch items failed.' : 'Batch request did not produce images.' };
}

function attachBatchImage(image: GeneratedImage, taskId: string, item: BatchGenerationItem, itemIndex: number, index: number, snapshot: GenerationRequestSnapshot): GeneratedImage {
  return {
    ...image,
    taskId,
    batchItemId: item.id,
    batchItemIndex: itemIndex,
    index,
    request: snapshot
  };
}

async function dispatchBatchEvent(taskId: string, event: BatchTaskReducerEvent, persist = true) {
  await patchTask(taskId, (task) => reduceBatchTask(task, event), { persist });
}

async function submitProviderRequest(input: ServerGenerationRunInput, signal: AbortSignal): Promise<Response> {
  const { upstream } = await getProviderAdapter(input.provider.adapterId).submitProviderMode({
    provider: input.provider,
    providerModeId: input.providerModeId,
    transport: input.transport,
    payload: input.payload,
    files: input.files,
    context: {
      signal,
      previewStreamMode: input.previewStreamMode
    }
  });
  return upstream;
}

async function runServerBatchItem(args: {
  taskId: string;
  item: ServerGenerationRunInput;
  batchItem: BatchGenerationItem;
  itemIndex: number;
  controller: AbortController;
  reserveFinalIndex: () => number;
}) {
  const { taskId, item, batchItem, itemIndex, controller, reserveFinalIndex } = args;
  const responseAdapter = getResponseAdapter(item.provider.adapterId);

  await dispatchBatchEvent(taskId, { type: 'item-sending', itemId: batchItem.id }, false);

  try {
    const upstream = await runWithRetryPolicy({
      policy: createRunnerRetryPolicy({ attempts: item.retryAttempts ?? 0, delaySeconds: item.retryDelaySeconds ?? 0 }),
      run: async () => {
        await dispatchBatchEvent(taskId, { type: 'item-running', itemId: batchItem.id, aggregateError: null }, false);
        return submitProviderRequest(item, controller.signal);
      },
      onRetry: ({ attempt, totalAttempts, error, waitMs }) => {
        void dispatchBatchEvent(taskId, {
          type: 'item-retrying',
          itemId: batchItem.id,
          retryText: `Retry ${attempt}/${totalAttempts} in ${Math.round(waitMs / 1000)}s: ${error}`,
          aggregateError: null
        }, false);
      },
      signal: controller.signal
    });

    if (isStreamedRun(item)) {
      const streamedImages = await consumeStreamedBatchItem({
        taskId,
        response: upstream,
        responseAdapter,
        batchItem,
        itemIndex,
        snapshot: item.snapshot,
        reserveFinalIndex
      });
      await dispatchBatchEvent(taskId, { type: 'item-succeeded', itemId: batchItem.id, images: sortImages(streamedImages), raw: null, streamed: true });
      return;
    }

    const raw = await readJsonOrThrow(upstream);
    const images = responseAdapter.collectImagesFromJson(raw, String(item.payload.output_format ?? 'png')).map((image) => {
      return attachBatchImage(image, taskId, batchItem, itemIndex, reserveFinalIndex(), item.snapshot);
    });
    await dispatchBatchEvent(taskId, { type: 'item-succeeded', itemId: batchItem.id, images, raw, streamed: false });
  } catch (error) {
    const cancelled = isAbortError(error) || controller.signal.aborted;
    await dispatchBatchEvent(taskId, {
      type: cancelled ? 'item-cancelled' : 'item-failed',
      itemId: batchItem.id,
      error: normalizeError(error),
      aggregateError: normalizeError(error)
    });
  }
}

async function runBatchTask(task: GenerationTask, input: ServerBatchGenerationRunInput, controller: AbortController) {
  let nextFinalIndex = 0;
  const reserveFinalIndex = () => nextFinalIndex++;
  try {
    await dispatchBatchEvent(task.id, { type: 'batch-started' }, false);
    await runDelayedParallelScheduler({
      items: input.items,
      intervalMs: input.intervalMs,
      signal: controller.signal,
      run: async ({ item, index }) => {
        const batchItem = task.batch?.items[index];
        if (!batchItem) return;
        await runServerBatchItem({ taskId: task.id, item, batchItem, itemIndex: index, controller, reserveFinalIndex });
      }
    });

    await patchTask(task.id, (current) => {
      const terminal = batchTerminal(current);
      return reduceBatchTask(current, { type: 'batch-finished', status: terminal.status, error: terminal.error });
    });
  } catch (error) {
    await dispatchBatchEvent(task.id, { type: 'active-items-cancelled', error: normalizeError(error) });
  } finally {
    taskControllers.delete(task.id);
  }
}

export async function startServerBatchGenerationRun(input: ServerBatchGenerationRunInput): Promise<GenerationTask> {
  if (input.items.length === 0) throw new Error('Batch request must contain at least one item.');
  const task = createBatchTask(input);
  const controller = new AbortController();
  taskControllers.set(task.id, controller);
  await mutateTasks((tasks) => [task, ...tasks.filter((item) => item.id !== task.id)]);
  void runBatchTask(task, input, controller);
  return task;
}

export async function startServerGenerationRun(input: ServerGenerationRunInput): Promise<GenerationTask> {
  const taskId = uid('task');
  const createdAt = Date.now();
  const controller = new AbortController();
  const task: GenerationTask = {
    id: taskId,
    kind: 'single',
    status: 'queued',
    createdAt,
    updatedAt: createdAt,
    galleryPath: normalizeGalleryPath(input.galleryPath),
    galleryPaths: normalizeGalleryPaths(undefined, input.galleryPath),
    request: input.snapshot,
    images: [],
    error: null
  };

  taskControllers.set(taskId, controller);
  await mutateTasks((tasks) => [task, ...tasks.filter((item) => item.id !== taskId)]);
  void runTask(taskId, input, controller);
  return task;
}

export async function deleteServerGenerationTask(taskId: string): Promise<void> {
  taskControllers.get(taskId)?.abort();
  taskControllers.delete(taskId);
  await mutateTasks((tasks) => tasks.filter((task) => task.id !== taskId));
}

export async function clearServerGenerationTasks(): Promise<void> {
  for (const controller of taskControllers.values()) controller.abort();
  taskControllers.clear();
  await mutateTasks(() => []);
}

export async function cancelServerGenerationTask(taskId: string): Promise<void> {
  const controller = taskControllers.get(taskId);
  if (!controller) return;
  controller.abort();
  await patchTask(taskId, (task) => transitionTask(task, 'cancelled', { error: 'Request was cancelled.', progress: null }));
}

function galleryPathIsNested(path: string, parent: string): boolean {
  const current = normalizeGalleryPath(path);
  const normalizedParent = normalizeGalleryPath(parent);
  if (normalizedParent === '/') return current !== '/';
  return current.startsWith(`${normalizedParent}/`);
}

function taskWithPaths(task: GenerationTask, paths: string[]): GenerationTask {
  const galleryPaths = normalizeGalleryPaths(paths);
  return { ...task, galleryPath: galleryPaths[0] ?? '/', galleryPaths, updatedAt: Date.now() };
}

function movePlacement(paths: string[], sourcePath: string, targetPath: string): string[] {
  const source = normalizeGalleryPath(sourcePath);
  const target = normalizeGalleryPath(targetPath);
  const rest = normalizeGalleryPaths(paths).filter((path) => path !== source);
  return normalizeGalleryPaths([...rest, target], target);
}

function cloneImageForTask(image: GeneratedImage, taskId: string, batchItemId?: string): GeneratedImage {
  return {
    ...image,
    id: uid('image'),
    taskId,
    batchItemId: batchItemId ?? image.batchItemId,
    storageAssetKey: undefined,
    storageThumbnailKey: undefined,
    storageAssetLoaded: undefined,
    request: image.request ? { ...image.request } : undefined
  };
}

function cloneTaskIntoPath(task: GenerationTask, targetPath: string): GenerationTask {
  const taskId = uid('task');
  const createdAt = Date.now();
  const batchIdMap = new Map<string, string>();
  const batch = task.batch ? {
    ...task.batch,
    items: task.batch.items.map((item) => {
      const nextItemId = uid('batch-item');
      batchIdMap.set(item.id, nextItemId);
      return {
        ...item,
        id: nextItemId,
        images: item.images.map((image) => cloneImageForTask(image, taskId, nextItemId))
      };
    })
  } : undefined;
  const galleryPaths = normalizeGalleryPaths(undefined, targetPath);
  return {
    ...task,
    id: taskId,
    createdAt,
    updatedAt: createdAt,
    galleryPath: galleryPaths[0] ?? '/',
    galleryPaths,
    images: task.images.map((image) => cloneImageForTask(image, taskId, image.batchItemId ? batchIdMap.get(image.batchItemId) : undefined)),
    batch
  };
}

export async function moveServerGalleryTask(taskId: string, targetPath: string): Promise<void> {
  const galleryPath = normalizeGalleryPath(targetPath);
  await patchTask(taskId, (task) => taskWithPaths(task, [galleryPath]));
}

export async function moveServerGalleryFolderTasks(sourcePath: string, nextPath: string): Promise<void> {
  const source = normalizeGalleryPath(sourcePath);
  const target = normalizeGalleryPath(nextPath);
  await mutateTasks((tasks) => tasks.map((task) => {
    const paths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath).map((path) => (
      path === source || galleryPathIsNested(path, source) ? mapGallerySubPath(path, source, target) : path
    ));
    return taskWithPaths(task, paths);
  }));
}

export type ServerGalleryPasteOperation = 'move' | 'link-copy' | 'deep-copy';

export interface ServerGalleryPasteItem {
  itemKind: 'task' | 'folder';
  itemId: string;
  sourcePath: string;
  nextPath?: string;
}

export async function pasteServerGalleryItems(args: { operation: ServerGalleryPasteOperation; targetPath: string; items: ServerGalleryPasteItem[] }): Promise<void> {
  const target = normalizeGalleryPath(args.targetPath);
  const items = args.items.map((item) => ({ ...item, sourcePath: normalizeGalleryPath(item.sourcePath), nextPath: item.nextPath ? normalizeGalleryPath(item.nextPath) : undefined }));
  await mutateTasks((tasks) => {
    const appended: GenerationTask[] = [];
    const nextTasks = tasks.flatMap((task) => {
      let paths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath);
      const taskSelections = items.filter((item) => item.itemKind === 'task' && item.itemId === task.id);
      const folderSelections = items.filter((item) => item.itemKind === 'folder');

      for (const item of taskSelections) {
        if (args.operation === 'move') paths = movePlacement(paths, item.sourcePath, target);
        if (args.operation === 'link-copy') paths = addGalleryPath(paths, target);
        if (args.operation === 'deep-copy') appended.push(cloneTaskIntoPath(task, target));
      }

      for (const item of folderSelections) {
        const nextRoot = item.nextPath ?? target;
        for (const path of normalizeGalleryPaths(task.galleryPaths, task.galleryPath)) {
          if (path !== item.sourcePath && !galleryPathIsNested(path, item.sourcePath)) continue;
          const mapped = mapGallerySubPath(path, item.sourcePath, nextRoot);
          if (args.operation === 'move') paths = movePlacement(paths, path, mapped);
          if (args.operation === 'link-copy') paths = addGalleryPath(paths, mapped);
          if (args.operation === 'deep-copy') appended.push(cloneTaskIntoPath(task, mapped));
        }
      }

      return [taskWithPaths(task, paths)];
    });
    return [...appended, ...nextTasks];
  });
}

export async function deleteServerGalleryFolderTasks(folderPath: string): Promise<void> {
  const source = normalizeGalleryPath(folderPath);
  await mutateTasks((tasks) => tasks.flatMap((task) => {
    const paths = normalizeGalleryPaths(task.galleryPaths, task.galleryPath).filter((path) => path !== source && !galleryPathIsNested(path, source));
    return paths.length > 0 ? [taskWithPaths(task, paths)] : [];
  }));
}

export function resetGenerationTaskRuntimeForTests() {
  for (const controller of taskControllers.values()) controller.abort();
  taskControllers.clear();
  runtimeTasks = null;
  mutationQueue = Promise.resolve();
  taskEventsRevision = 0;
  for (const client of clients) client.end();
  clients.clear();
}

export function subscribeGenerationTaskEvents(req: express.Request, res: express.Response) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  clients.add(res);
  sendEvent(res, 'tasks', { revision: taskEventsRevision, tasks: clientSnapshotTasks() });

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keep-alive\n\n');
  }, 25_000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
}
