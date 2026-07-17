import type { GenerationTask } from './generationTask';
import { isActiveGenerationStatus, normalizeGenerationStatus } from './generationStatus';

export const defaultMaxStoredGenerationTasks = 1000;
export const minStoredGenerationTasks = 1;
export const maxStoredGenerationTasks = 10000;

export function normalizeMaxStoredGenerationTasks(
  value: unknown,
  fallback = defaultMaxStoredGenerationTasks
): number {
  const numeric = Math.floor(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(maxStoredGenerationTasks, Math.max(minStoredGenerationTasks, numeric));
}

export function retainGenerationTasksByCompletedLimit(
  tasks: readonly GenerationTask[],
  completedLimit: unknown
): GenerationTask[] {
  const limit = normalizeMaxStoredGenerationTasks(completedLimit);
  let completedCount = 0;
  const retained: GenerationTask[] = [];

  for (const task of tasks) {
    const status = normalizeGenerationStatus(task.status);
    if (isActiveGenerationStatus(status)) {
      retained.push(task);
      continue;
    }
    if (completedCount >= limit) continue;
    completedCount += 1;
    retained.push(task);
  }

  return retained;
}
