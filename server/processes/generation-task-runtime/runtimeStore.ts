import type { GenerationTask } from '../../../src/domain/generationTask';
import type { GenerationTasksEvent } from '../../../src/domain/generationTaskEvents';
import { normalizeGenerationTasks } from '../../../src/entities/storage';
import { loadGenerationTaskHistoryDocumentsAsync, saveGenerationTaskHistoryDocumentsAsync } from '../../storage/generationTaskStoreAsync';
import { serializeGenerationTaskHistoryForClient } from '../generationTaskHistoryClientSerialization';
import { serializeLiveGenerationTaskImagesForClient } from '../liveGenerationImageStore';
import { createRuntimePersistenceCoordinator } from './runtimePersistenceCoordinator';
import {
  broadcastTasksDelta,
  broadcastTaskUpsert,
  currentTaskEventsRevision,
  hasTaskEventClients,
  nextTaskEventsRevision
} from './taskEvents';

export interface RuntimeTaskPersistencePort {
  load(): Promise<GenerationTask[]>;
  save(tasks: GenerationTask[]): Promise<void>;
}

export interface RuntimeTaskSerializationPort {
  serializeTask(task: GenerationTask): GenerationTask;
  serializeTasks(tasks: GenerationTask[]): GenerationTask[];
}

export interface RuntimeTaskEventPublisherPort {
  hasClients(): boolean;
  currentRevision(): number;
  nextRevision(): number;
  broadcastTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number): void;
  broadcastTaskUpsert(task: GenerationTask, revision: number, taskIds?: string[]): void;
}

export interface GenerationTaskRuntimeStore {
  ensureRuntimeTasks(): Promise<GenerationTask[]>;
  clientSnapshotTasks(): Promise<GenerationTask[]>;
  clientSnapshotEvent(): Promise<GenerationTasksEvent>;
  mutateTasks(recipe: (tasks: GenerationTask[]) => GenerationTask[], options?: { persist?: boolean }): Promise<void>;
  prependTask(task: GenerationTask, options?: { persist?: boolean }): Promise<void>;
  patchTask(taskId: string, recipe: (task: GenerationTask) => GenerationTask, options?: { persist?: boolean }): Promise<void>;
  waitForPersistenceForTests(): Promise<void>;
  resetForTests(): void;
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
  }
};

export const defaultRuntimeTaskEventPublisher: RuntimeTaskEventPublisherPort = {
  hasClients: hasTaskEventClients,
  currentRevision: currentTaskEventsRevision,
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
  let initializationPromise: Promise<GenerationTask[]> | null = null;
  let mutationQueue: Promise<void> = Promise.resolve();
  const persistenceCoordinator = createRuntimePersistenceCoordinator((tasks) => persistence.save(tasks));

  async function initializeRuntimeTasks(): Promise<GenerationTask[]> {
    if (runtimeTasks) return runtimeTasks;
    if (!initializationPromise) {
      initializationPromise = persistence.load()
        .then((loadedTasks) => {
          runtimeTasks = loadedTasks;
          return loadedTasks;
        })
        .catch((error) => {
          initializationPromise = null;
          throw error;
        });
    }
    return initializationPromise;
  }

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = mutationQueue.catch(() => undefined).then(operation);
    mutationQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  async function ensureRuntimeTasks(): Promise<GenerationTask[]> {
    return [...await initializeRuntimeTasks()];
  }

  async function clientSnapshotEvent(): Promise<GenerationTasksEvent> {
    return enqueue(async () => {
      const tasks = await initializeRuntimeTasks();
      return {
        revision: events.currentRevision(),
        tasks: serialization.serializeTasks(tasks)
      };
    });
  }

  async function clientSnapshotTasks(): Promise<GenerationTask[]> {
    return (await clientSnapshotEvent()).tasks;
  }

  return {
    ensureRuntimeTasks,
    clientSnapshotTasks,
    clientSnapshotEvent,
    async mutateTasks(recipe, options = {}) {
      await enqueue(async () => {
        const currentTasks = await initializeRuntimeTasks();
        const previousClientTasks = events.hasClients() ? serialization.serializeTasks(currentTasks) : [];
        runtimeTasks = recipe([...currentTasks]);
        if (options.persist !== false) persistenceCoordinator.schedule(runtimeTasks);
        const revision = events.nextRevision();
        if (events.hasClients()) {
          events.broadcastTasksDelta(previousClientTasks, serialization.serializeTasks(runtimeTasks), revision);
        }
      });
    },
    async prependTask(task, options = {}) {
      await enqueue(async () => {
        const currentTasks = await initializeRuntimeTasks();
        runtimeTasks = [task, ...currentTasks.filter((item) => item.id !== task.id)];
        if (options.persist !== false) persistenceCoordinator.schedule(runtimeTasks);
        const revision = events.nextRevision();
        if (events.hasClients()) {
          events.broadcastTaskUpsert(serialization.serializeTask(task), revision, runtimeTasks.map((item) => item.id));
        }
      });
    },
    async patchTask(taskId, recipe, options = {}) {
      await enqueue(async () => {
        const tasks = await initializeRuntimeTasks();
        const taskIndex = tasks.findIndex((task) => task.id === taskId);
        if (taskIndex < 0) return;

        const changedTask = recipe(tasks[taskIndex]);
        runtimeTasks = [...tasks];
        runtimeTasks[taskIndex] = changedTask;
        if (options.persist !== false) persistenceCoordinator.schedule(runtimeTasks);
        const revision = events.nextRevision();
        if (events.hasClients()) events.broadcastTaskUpsert(serialization.serializeTask(changedTask), revision);
      });
    },
    waitForPersistenceForTests: () => persistenceCoordinator.waitForIdleForTests(),
    resetForTests() {
      runtimeTasks = null;
      initializationPromise = null;
      mutationQueue = Promise.resolve();
      persistenceCoordinator.resetForTests();
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

export function clientSnapshotEvent(): Promise<GenerationTasksEvent> {
  return defaultRuntimeStore.clientSnapshotEvent();
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

export function waitForRuntimeTaskPersistenceForTests() {
  return defaultRuntimeStore.waitForPersistenceForTests();
}

export function resetRuntimeStoreForTests() {
  defaultRuntimeStore.resetForTests();
}
