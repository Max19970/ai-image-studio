import type { GenerationTask } from '../../../src/domain/generationTask';
import { normalizeGenerationTasks } from '../../../src/entities/storage';
import { loadGenerationTaskHistoryDocumentsAsync, saveGenerationTaskHistoryDocumentsAsync } from '../../storage/generationTaskStoreAsync';
import { serializeGenerationTaskHistoryForClient } from '../generationTaskHistoryClientSerialization';
import { serializeLiveGenerationTaskImagesForClient } from '../liveGenerationImageStore';
import { isActiveStatus, taskPersistableFinalImageCount } from './imageState';
import { broadcastTasksDelta, broadcastTaskUpsert, hasTaskEventClients, nextTaskEventsRevision } from './taskEvents';

export interface RuntimeTaskPersistencePort {
  load(): Promise<GenerationTask[]>;
  save(tasks: GenerationTask[]): Promise<void>;
}

export interface RuntimeTaskSerializationPort {
  serializeTask(task: GenerationTask): GenerationTask;
  serializeTasks(tasks: GenerationTask[]): GenerationTask[];
  loadClientSnapshot(): Promise<GenerationTask[]>;
}

export interface RuntimeTaskEventPublisherPort {
  hasClients(): boolean;
  nextRevision(): number;
  broadcastTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number): void;
  broadcastTaskUpsert(task: GenerationTask, revision: number, taskIds?: string[]): void;
}

export interface GenerationTaskRuntimeStore {
  ensureRuntimeTasks(): Promise<GenerationTask[]>;
  clientSnapshotTasks(): Promise<GenerationTask[]>;
  mutateTasks(recipe: (tasks: GenerationTask[]) => GenerationTask[], options?: { persist?: boolean }): Promise<void>;
  prependTask(task: GenerationTask, options?: { persist?: boolean }): Promise<void>;
  patchTask(taskId: string, recipe: (task: GenerationTask) => GenerationTask, options?: { persist?: boolean }): Promise<void>;
  resetForTests(): void;
}

function isEmptyActiveTask(task: GenerationTask): boolean {
  if (taskPersistableFinalImageCount(task) > 0) return false;
  return isActiveStatus(task.status);
}

function runtimePersistableTasks(tasks: GenerationTask[]): GenerationTask[] {
  return tasks.filter((task) => !isEmptyActiveTask(task));
}

export const defaultRuntimeTaskPersistence: RuntimeTaskPersistencePort = {
  async load() {
    const result = await loadGenerationTaskHistoryDocumentsAsync({ limit: 1000, offset: 0, assetMode: 'metadata' });
    return normalizeGenerationTasks(result.tasks, 1000);
  },
  async save(tasks) {
    await saveGenerationTaskHistoryDocumentsAsync(tasks);
  }
};

export const defaultRuntimeTaskSerialization: RuntimeTaskSerializationPort = {
  serializeTask(task) {
    const serialized = serializeGenerationTaskHistoryForClient([task], 'thumbnail') as GenerationTask[];
    return serializeLiveGenerationTaskImagesForClient(serialized[0] ?? task);
  },
  serializeTasks(tasks) {
    return tasks.map((task) => defaultRuntimeTaskSerialization.serializeTask(task));
  },
  async loadClientSnapshot() {
    const result = await loadGenerationTaskHistoryDocumentsAsync({ limit: 1000, offset: 0, assetMode: 'metadata' });
    return serializeGenerationTaskHistoryForClient(result.tasks, 'thumbnail') as GenerationTask[];
  }
};

export const defaultRuntimeTaskEventPublisher: RuntimeTaskEventPublisherPort = {
  hasClients: hasTaskEventClients,
  nextRevision: nextTaskEventsRevision,
  broadcastTasksDelta,
  broadcastTaskUpsert
};

export function createGenerationTaskRuntimeStore(
  persistence: RuntimeTaskPersistencePort = defaultRuntimeTaskPersistence,
  serialization: RuntimeTaskSerializationPort = defaultRuntimeTaskSerialization,
  events: RuntimeTaskEventPublisherPort = defaultRuntimeTaskEventPublisher
): GenerationTaskRuntimeStore {
  let runtimeTasks: GenerationTask[] | null = null;
  let mutationQueue: Promise<void> = Promise.resolve();
  let persistenceQueue: Promise<void> = Promise.resolve();

  async function ensureRuntimeTasks(): Promise<GenerationTask[]> {
    if (!runtimeTasks) runtimeTasks = await persistence.load();
    return runtimeTasks;
  }

  async function clientSnapshotTasks(): Promise<GenerationTask[]> {
    if (!runtimeTasks) return serialization.loadClientSnapshot();
    return serialization.serializeTasks(runtimeTasks);
  }

  function scheduleRuntimeTaskPersistence(tasks: GenerationTask[]) {
    const snapshot = runtimePersistableTasks(tasks);
    if (snapshot.length === 0 && tasks.length > 0) return;

    persistenceQueue = persistenceQueue.catch(() => undefined).then(async () => {
      await persistence.save(snapshot);
    });
    void persistenceQueue.catch((error) => {
      console.error('[generation-task-runtime] failed to persist task history:', error);
    });
  }

  return {
    ensureRuntimeTasks,
    clientSnapshotTasks,
    async mutateTasks(recipe, options = {}) {
      mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
        const previousClientTasks = events.hasClients() && runtimeTasks ? await clientSnapshotTasks() : [];
        runtimeTasks = recipe(await ensureRuntimeTasks());
        if (options.persist !== false) scheduleRuntimeTaskPersistence(runtimeTasks);
        const revision = events.nextRevision();
        if (events.hasClients()) events.broadcastTasksDelta(previousClientTasks, await clientSnapshotTasks(), revision);
      });
      await mutationQueue;
    },
    async prependTask(task, options = {}) {
      mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
        runtimeTasks = [task, ...(await ensureRuntimeTasks()).filter((item) => item.id !== task.id)];
        if (options.persist !== false) scheduleRuntimeTaskPersistence(runtimeTasks);
        const revision = events.nextRevision();
        if (events.hasClients()) events.broadcastTaskUpsert(serialization.serializeTask(task), revision, runtimeTasks.map((item) => item.id));
      });
      await mutationQueue;
    },
    async patchTask(taskId, recipe, options = {}) {
      mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
        const tasks = await ensureRuntimeTasks();
        const taskIndex = tasks.findIndex((task) => task.id === taskId);
        if (taskIndex < 0) return;

        const changedTask = recipe(tasks[taskIndex]);
        runtimeTasks = [...tasks];
        runtimeTasks[taskIndex] = changedTask;
        if (options.persist !== false) scheduleRuntimeTaskPersistence(runtimeTasks);
        const revision = events.nextRevision();
        events.broadcastTaskUpsert(serialization.serializeTask(changedTask), revision);
      });
      await mutationQueue;
    },
    resetForTests() {
      runtimeTasks = null;
      mutationQueue = Promise.resolve();
      persistenceQueue = Promise.resolve();
    }
  };
}

const defaultRuntimeStore = createGenerationTaskRuntimeStore();

export function ensureRuntimeTasks(): Promise<GenerationTask[]> {
  return defaultRuntimeStore.ensureRuntimeTasks();
}

export function clientSnapshotTasks(): Promise<GenerationTask[]> {
  return defaultRuntimeStore.clientSnapshotTasks();
}

export async function mutateTasks(recipe: (tasks: GenerationTask[]) => GenerationTask[], options: { persist?: boolean } = {}) {
  await defaultRuntimeStore.mutateTasks(recipe, options);
}

export async function prependTask(task: GenerationTask, options: { persist?: boolean } = {}) {
  await defaultRuntimeStore.prependTask(task, options);
}

export async function patchTask(taskId: string, recipe: (task: GenerationTask) => GenerationTask, options: { persist?: boolean } = {}) {
  await defaultRuntimeStore.patchTask(taskId, recipe, options);
}

export function resetRuntimeStoreForTests() {
  defaultRuntimeStore.resetForTests();
}
