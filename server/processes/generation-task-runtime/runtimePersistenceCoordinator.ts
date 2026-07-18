import type { GenerationTask } from '../../../src/domain/generationTask';
import { isActiveStatus, taskPersistableFinalImageCount } from './imageState';

export interface RuntimePersistenceCoordinator {
  schedule(tasks: GenerationTask[]): void;
  waitForIdle(): Promise<void>;
  waitForIdleForTests(): Promise<void>;
  resetForTests(): void;
}

function isEmptyActiveTask(task: GenerationTask): boolean {
  if (taskPersistableFinalImageCount(task) > 0) return false;
  return isActiveStatus(task.status);
}

function persistableSnapshot(tasks: GenerationTask[]): GenerationTask[] {
  return tasks.filter((task) => !isEmptyActiveTask(task));
}

export function createRuntimePersistenceCoordinator(
  save: (tasks: GenerationTask[]) => Promise<void>
): RuntimePersistenceCoordinator {
  let pendingSnapshot: GenerationTask[] | null = null;
  let inFlight: Promise<void> | null = null;
  let generation = 0;
  const runs = new Set<Promise<void>>();

  function startDrain() {
    if (inFlight) return;
    const activeGeneration = generation;
    const active = (async () => {
      while (activeGeneration === generation && pendingSnapshot) {
        const snapshot = pendingSnapshot;
        pendingSnapshot = null;
        try {
          await save(snapshot);
        } catch (error) {
          console.error('[generation-task-runtime] failed to persist task history:', error);
        }
      }
    })();
    inFlight = active;
    runs.add(active);
    void active.finally(() => {
      runs.delete(active);
      if (activeGeneration !== generation || inFlight !== active) return;
      inFlight = null;
      if (pendingSnapshot) startDrain();
    });
  }

  return {
    schedule(tasks) {
      const snapshot = persistableSnapshot(tasks);
      if (snapshot.length === 0 && tasks.length > 0) return;
      pendingSnapshot = snapshot;
      startDrain();
    },
    async waitForIdle() {
      while (runs.size > 0) await Promise.allSettled([...runs]);
    },
    async waitForIdleForTests() {
      while (runs.size > 0) await Promise.allSettled([...runs]);
    },
    resetForTests() {
      pendingSnapshot = null;
      inFlight = null;
      generation += 1;
    }
  };
}
