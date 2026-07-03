import type express from 'express';
import type { GeneratedImage, GenerationProgress, GenerationTask } from '../../../src/domain/generationTask';
import type { GenerationTasksDeltaEvent } from '../../../src/domain/generationTaskEvents';

type Client = express.Response;

const clients = new Set<Client>();
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

function hasTaskOrderChanged(previousTasks: GenerationTask[], nextTasks: GenerationTask[]): boolean {
  if (previousTasks.length !== nextTasks.length) return true;
  return nextTasks.some((task, index) => previousTasks[index]?.id !== task.id);
}

function createTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number): GenerationTasksDeltaEvent {
  const previousSignatures = new Map(previousTasks.map((task) => [task.id, taskDeltaSignature(task)]));
  const nextIds = new Set(nextTasks.map((task) => task.id));
  const deletedIds = previousTasks.flatMap((task) => nextIds.has(task.id) ? [] : [task.id]);
  const upserted = nextTasks.filter((task) => previousSignatures.get(task.id) !== taskDeltaSignature(task));
  const taskIds = hasTaskOrderChanged(previousTasks, nextTasks) ? nextTasks.map((task) => task.id) : undefined;
  return {
    revision,
    ...(taskIds ? { taskIds } : {}),
    upserted,
    deletedIds
  };
}

function sendEvent(client: Client, event: string, data: unknown) {
  client.write(`event: ${event}\n`);
  client.write(`data: ${JSON.stringify(data)}\n\n`);
}

export function hasTaskEventClients(): boolean {
  return clients.size > 0;
}

export function nextTaskEventsRevision(): number {
  return ++taskEventsRevision;
}

export function broadcastTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number) {
  if (clients.size === 0) return;
  const delta = createTasksDelta(previousTasks, nextTasks, revision);
  if (delta.upserted.length === 0 && delta.deletedIds.length === 0 && delta.taskIds === undefined) return;
  for (const client of clients) sendEvent(client, 'tasks-delta', delta);
}

export function broadcastTaskUpsert(task: GenerationTask, revision: number, taskIds?: string[]) {
  if (clients.size === 0) return;
  const delta: GenerationTasksDeltaEvent = {
    revision,
    ...(taskIds ? { taskIds } : {}),
    upserted: [task],
    deletedIds: []
  };
  for (const client of clients) sendEvent(client, 'tasks-delta', delta);
}

export function subscribeGenerationTaskEvents(
  req: express.Request,
  res: express.Response,
  getSnapshot: () => Promise<GenerationTask[]>
) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  clients.add(res);
  void getSnapshot()
    .then((tasks) => {
      if (!res.writableEnded) sendEvent(res, 'tasks', { revision: taskEventsRevision, tasks });
    })
    .catch((error) => {
      console.error('[generation-task-runtime] failed to create task event snapshot:', error);
      if (!res.writableEnded) sendEvent(res, 'tasks-error', { message: error instanceof Error ? error.message : String(error) });
    });

  const keepAlive = setInterval(() => {
    if (!res.writableEnded) res.write(': keep-alive\n\n');
  }, 25_000);

  req.on('close', () => {
    clearInterval(keepAlive);
    clients.delete(res);
  });
}

export function resetTaskEventsForTests() {
  taskEventsRevision = 0;
  for (const client of clients) client.end();
  clients.clear();
}
