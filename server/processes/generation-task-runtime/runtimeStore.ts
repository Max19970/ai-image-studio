import type { GenerationTask } from '../../../src/domain/generationTask';
import { normalizeGenerationTasks } from '../../../src/entities/storage';
import { loadGenerationTaskHistoryDocuments, saveGenerationTaskHistoryDocuments } from '../../storage/generationTaskStore';
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
    saveGenerationTaskHistoryDocuments(snapshot);
  });
  void persistenceQueue.catch((error) => {
    console.error('[generation-task-runtime] failed to persist task history:', error);
  });
}

export function ensureRuntimeTasks(): GenerationTask[] {
  if (!runtimeTasks) {
    const result = loadGenerationTaskHistoryDocuments({ limit: 120, offset: 0, assetMode: 'full' });
    runtimeTasks = normalizeGenerationTasks(result.tasks, 120);
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

export function clientSnapshotTasks(): GenerationTask[] {
  if (!runtimeTasks) {
    const result = loadGenerationTaskHistoryDocuments({ limit: 120, offset: 0, assetMode: 'metadata' });
    return serializeGenerationTaskHistoryForClient(result.tasks, 'thumbnail') as GenerationTask[];
  }

  return serializeClientTasks(runtimeTasks);
}

export async function mutateTasks(recipe: (tasks: GenerationTask[]) => GenerationTask[], options: { persist?: boolean } = {}) {
  mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
    const previousClientTasks = hasTaskEventClients() && runtimeTasks ? clientSnapshotTasks() : [];
    runtimeTasks = recipe(ensureRuntimeTasks());
    if (options.persist !== false) scheduleRuntimeTaskPersistence(runtimeTasks);
    const revision = nextTaskEventsRevision();
    if (hasTaskEventClients()) broadcastTasksDelta(previousClientTasks, clientSnapshotTasks(), revision);
  });
  await mutationQueue;
}

function currentRuntimeTaskIds(): string[] {
  return ensureRuntimeTasks().map((task) => task.id);
}

export async function patchTask(taskId: string, recipe: (task: GenerationTask) => GenerationTask, options: { persist?: boolean } = {}) {
  mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
    let changedTask: GenerationTask | null = null;
    runtimeTasks = ensureRuntimeTasks().map((task) => {
      if (task.id !== taskId) return task;
      changedTask = recipe(task);
      return changedTask;
    });
    if (!changedTask) return;
    if (options.persist !== false) scheduleRuntimeTaskPersistence(runtimeTasks);
    const revision = nextTaskEventsRevision();
    broadcastTaskUpsert(serializeClientTask(changedTask), revision, currentRuntimeTaskIds());
  });
  await mutationQueue;
}

export function resetRuntimeStoreForTests() {
  runtimeTasks = [];
  mutationQueue = Promise.resolve();
  persistenceQueue = Promise.resolve();
}
