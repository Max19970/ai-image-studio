import type express from 'express';
import { isAbortError } from '../../src/domain/asyncFlow';
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
}

export interface ServerBatchGenerationRunInput {
  items: ServerGenerationRunInput[];
  intervalMs: number;
  aggregateSnapshot?: GenerationRequestSnapshot | null;
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

function sendEvent(client: Client, event: string, data: unknown) {
  client.write(`event: ${event}\n`);
  client.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastTasks() {
  const tasks = clientSnapshotTasks();
  for (const client of clients) sendEvent(client, 'tasks', { tasks });
}

async function mutateTasks(recipe: (tasks: GenerationTask[]) => GenerationTask[], options: { persist?: boolean } = {}) {
  mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
    runtimeTasks = recipe(ensureRuntimeTasks());
    if (options.persist !== false) saveGenerationTaskHistoryDocuments(runtimeTasks);
    broadcastTasks();
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

export function resetGenerationTaskRuntimeForTests() {
  for (const controller of taskControllers.values()) controller.abort();
  taskControllers.clear();
  runtimeTasks = null;
  mutationQueue = Promise.resolve();
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
  sendEvent(res, 'tasks', { tasks: clientSnapshotTasks() });

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keep-alive\n\n');
  }, 25_000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
}
