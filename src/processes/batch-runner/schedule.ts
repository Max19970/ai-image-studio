import { runDelayedParallelScheduler, type ScheduledTask } from '../generation-task-lifecycle';

export function normalizeBatchIntervalSeconds(intervalSeconds: number) {
  return Math.max(0, Math.round(intervalSeconds * 1000));
}

export { runDelayedParallelScheduler };
export type { ScheduledTask };
