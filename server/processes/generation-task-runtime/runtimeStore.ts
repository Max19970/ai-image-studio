import type { GenerationTask } from '../../../src/domain/generationTask';
import { normalizeGenerationTasks } from '../../../src/entities/storage';
import { loadGenerationTaskHistoryDocumentsAsync, saveGenerationTaskHistoryDocumentsAsync } from '../../storage/generationTaskStoreAsync';
import { serializeGenerationTaskHistoryForClient } from '../generationTaskHistoryClientSerialization';
import { serializeLiveGenerationTaskImagesForClient } from '../liveGenerationImageStore';
import { isActiveStatus, taskPersistableFinalImageCount } from './imageState';
import { broadcastTasksDelta, broadcastTaskUpsert, hasTaskEventClients, nextTaskEventsRevision } from './taskEvents';

let runtimeTasks: GenerationTask[] | null = null;
let mutationQueue: Promise<void> = Promise.resolve();
let persistenceQueue: Promise<void> = Promise.resolve();

function isEmptyActiveTask(task: GenerationTask): boolean {
  if (taskPersistableFinalImageCount(task) > 0) return false;
  return isActiveStatus(task.status);
}

function runtimePersistableTasks(tasks: GenerationTask[]): GenerationTask[] {
  return tasks.filter((task) => !isEmptyActiveTask(task));
}

function scheduleRuntimeTaskPersistence(tasks: GenerationTask[]) {
  const snapshot = runtimePersistableTasks(tasks);
  if (snapshot.length === 0 && tasks.length > 0) return;

  persistenceQueue = persistenceQueue.catch(() => undefined).then(async () => {
    await saveGenerationTaskHistoryDocumentsAsync(snapshot);
  });
  void persistenceQueue.catch((error) => {
    console.error('[generation-task-runtime] failed to persist task history:', error);
  });
}

export async function ensureRuntimeTasks(): Promise<GenerationTask[]> {
  if (!runtimeTasks) {
    const result = await loadGenerationTaskHistoryDocumentsAsync({ limit: 1000, offset: 0, assetMode: 'metadata' });
    runtimeTasks = normalizeGenerationTasks(result.tasks, 1000);
  }
  return runtimeTasks;
}

function serializeClientTask(task: GenerationTask): GenerationTask {
  const serialized = serializeGenerationTaskHistoryForClient([task], 'thumbnail') as GenerationTask[];
  return serializeLiveGenerationTaskImagesForClient(serialized[0] ?? task);
}

function serializeClientTasks(tasks: GenerationTask[]): GenerationTask[] {
  return tasks.map(serializeClientTask);
}

export async function clientSnapshotTasks(): Promise<GenerationTask[]> {
  if (!runtimeTasks) {
    const result = await loadGenerationTaskHistoryDocumentsAsync({ limit: 1000, offset: 0, assetMode: 'metadata' });
    return serializeGenerationTaskHistoryForClient(result.tasks, 'thumbnail') as GenerationTask[];
  }

  return serializeClientTasks(runtimeTasks);
}

export async function mutateTasks(recipe: (tasks: GenerationTask[]) => GenerationTask[], options: { persist?: boolean } = {}) {
  mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
    const previousClientTasks = hasTaskEventClients() && runtimeTasks ? await clientSnapshotTasks() : [];
    runtimeTasks = recipe(await ensureRuntimeTasks());
    if (options.persist !== false) scheduleRuntimeTaskPersistence(runtimeTasks);
    const revision = nextTaskEventsRevision();
    if (hasTaskEventClients()) broadcastTasksDelta(previousClientTasks, await clientSnapshotTasks(), revision);
  });
  await mutationQueue;
}

export async function prependTask(task: GenerationTask, options: { persist?: boolean } = {}) {
  mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
    runtimeTasks = [task, ...(await ensureRuntimeTasks()).filter((item) => item.id !== task.id)];
    if (options.persist !== false) scheduleRuntimeTaskPersistence(runtimeTasks);
    const revision = nextTaskEventsRevision();
    if (hasTaskEventClients()) broadcastTaskUpsert(serializeClientTask(task), revision, runtimeTasks.map((item) => item.id));
  });
  await mutationQueue;
}

export async function patchTask(taskId: string, recipe: (task: GenerationTask) => GenerationTask, options: { persist?: boolean } = {}) {
  mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
    const tasks = await ensureRuntimeTasks();
    const taskIndex = tasks.findIndex((task) => task.id === taskId);
    if (taskIndex < 0) return;

    const changedTask = recipe(tasks[taskIndex]);
    runtimeTasks = [...tasks];
    runtimeTasks[taskIndex] = changedTask;
    if (options.persist !== false) scheduleRuntimeTaskPersistence(runtimeTasks);
    const revision = nextTaskEventsRevision();
    broadcastTaskUpsert(serializeClientTask(changedTask), revision);
  });
  await mutationQueue;
}

export function resetRuntimeStoreForTests() {
  runtimeTasks = null;
  mutationQueue = Promise.resolve();
  persistenceQueue = Promise.resolve();
}
