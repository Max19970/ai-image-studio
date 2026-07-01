import type { GenerationTask } from '../../../src/domain/generationTask';
import { normalizeGenerationTasks } from '../../../src/entities/storage';
import { loadGenerationTaskHistoryDocuments, saveGenerationTaskHistoryDocuments } from '../../storage/generationTaskStore';
import { serializeGenerationTaskHistoryForClient } from '../generationTaskHistoryClientSerialization';
import { serializeLiveGenerationTaskImagesForClient } from '../liveGenerationImageStore';
import { isActiveStatus, taskPersistableFinalImageCount } from './imageState';
import { broadcastTasksDelta, broadcastTaskUpsert, hasTaskEventClients, nextTaskEventsRevision } from './taskEvents';

export interface RuntimeTaskPersistencePort {
  load(): GenerationTask[];
  save(tasks: GenerationTask[]): void;
}

export interface RuntimeTaskSerializationPort {
  serializeTask(task: GenerationTask): GenerationTask;
  serializeTasks(tasks: GenerationTask[]): GenerationTask[];
  loadClientSnapshot(): GenerationTask[];
}

export interface RuntimeTaskEventPublisherPort {
  hasClients(): boolean;
  nextRevision(): number;
  broadcastTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number): void;
  broadcastTaskUpsert(task: GenerationTask, revision: number, taskIds: string[]): void;
}

export interface GenerationTaskRuntimeStore {
  ensureRuntimeTasks(): GenerationTask[];
  clientSnapshotTasks(): GenerationTask[];
  mutateTasks(recipe: (tasks: GenerationTask[]) => GenerationTask[], options?: { persist?: boolean }): Promise<void>;
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
  load() {
    const result = loadGenerationTaskHistoryDocuments({ limit: 120, offset: 0, assetMode: 'full' });
    return normalizeGenerationTasks(result.tasks, 120);
  },
  save(tasks) {
    saveGenerationTaskHistoryDocuments(tasks);
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
  loadClientSnapshot() {
    const result = loadGenerationTaskHistoryDocuments({ limit: 120, offset: 0, assetMode: 'metadata' });
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

  function ensureRuntimeTasks(): GenerationTask[] {
    if (!runtimeTasks) runtimeTasks = persistence.load();
    return runtimeTasks;
  }

  function clientSnapshotTasks(): GenerationTask[] {
    if (!runtimeTasks) return serialization.loadClientSnapshot();
    return serialization.serializeTasks(runtimeTasks);
  }

  function scheduleRuntimeTaskPersistence(tasks: GenerationTask[]) {
    const snapshot = runtimePersistableTasks(tasks);
    if (snapshot.length === 0 && tasks.length > 0) return;

    persistenceQueue = persistenceQueue.catch(() => undefined).then(async () => {
      persistence.save(snapshot);
    });
    void persistenceQueue.catch((error) => {
      console.error('[generation-task-runtime] failed to persist task history:', error);
    });
  }

  function currentRuntimeTaskIds(): string[] {
    return ensureRuntimeTasks().map((task) => task.id);
  }

  return {
    ensureRuntimeTasks,
    clientSnapshotTasks,
    async mutateTasks(recipe, options = {}) {
      mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
        const previousClientTasks = events.hasClients() && runtimeTasks ? clientSnapshotTasks() : [];
        runtimeTasks = recipe(ensureRuntimeTasks());
        if (options.persist !== false) scheduleRuntimeTaskPersistence(runtimeTasks);
        const revision = events.nextRevision();
        if (events.hasClients()) events.broadcastTasksDelta(previousClientTasks, clientSnapshotTasks(), revision);
      });
      await mutationQueue;
    },
    async patchTask(taskId, recipe, options = {}) {
      mutationQueue = mutationQueue.catch(() => undefined).then(async () => {
        let changedTask: GenerationTask | null = null;
        runtimeTasks = ensureRuntimeTasks().map((task) => {
          if (task.id !== taskId) return task;
          changedTask = recipe(task);
          return changedTask;
        });
        if (!changedTask) return;
        if (options.persist !== false) scheduleRuntimeTaskPersistence(runtimeTasks);
        const revision = events.nextRevision();
        events.broadcastTaskUpsert(serialization.serializeTask(changedTask), revision, currentRuntimeTaskIds());
      });
      await mutationQueue;
    },
    resetForTests() {
      runtimeTasks = [];
      mutationQueue = Promise.resolve();
      persistenceQueue = Promise.resolve();
    }
  };
}

const defaultRuntimeStore = createGenerationTaskRuntimeStore();

export function ensureRuntimeTasks(): GenerationTask[] {
  return defaultRuntimeStore.ensureRuntimeTasks();
}

export function clientSnapshotTasks(): GenerationTask[] {
  return defaultRuntimeStore.clientSnapshotTasks();
}

export async function mutateTasks(recipe: (tasks: GenerationTask[]) => GenerationTask[], options: { persist?: boolean } = {}) {
  await defaultRuntimeStore.mutateTasks(recipe, options);
}

export async function patchTask(taskId: string, recipe: (task: GenerationTask) => GenerationTask, options: { persist?: boolean } = {}) {
  await defaultRuntimeStore.patchTask(taskId, recipe, options);
}

export function resetRuntimeStoreForTests() {
  defaultRuntimeStore.resetForTests();
}
