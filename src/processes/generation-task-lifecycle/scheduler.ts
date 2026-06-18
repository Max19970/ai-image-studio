import { delay } from '../../domain/asyncFlow';

export interface ScheduledTask<T> {
  item: T;
  index: number;
  delayMs: number;
}

export interface DelayedParallelSchedulerOptions<T> {
  items: T[];
  intervalMs: number;
  maxConcurrency?: number;
  signal: AbortSignal;
  onBeforeDelay?: (task: ScheduledTask<T>) => void;
  onBeforeRun?: (task: ScheduledTask<T>) => void;
  run: (task: ScheduledTask<T>) => Promise<void>;
}

function normalizeConcurrency(maxConcurrency?: number) {
  if (!Number.isFinite(maxConcurrency ?? Number.POSITIVE_INFINITY)) return Number.POSITIVE_INFINITY;
  return Math.max(1, Math.floor(maxConcurrency ?? Number.POSITIVE_INFINITY));
}

export function createDelayedParallelSchedule<T>(items: T[], intervalMs: number): ScheduledTask<T>[] {
  return items.map((item, index) => ({
    item,
    index,
    delayMs: Math.max(0, intervalMs) * index
  }));
}

export async function runDelayedParallelScheduler<T>(options: DelayedParallelSchedulerOptions<T>) {
  const schedule = createDelayedParallelSchedule(options.items, options.intervalMs);
  const maxConcurrency = normalizeConcurrency(options.maxConcurrency);
  let nextIndex = 0;

  const runOne = async () => {
    while (nextIndex < schedule.length) {
      const task = schedule[nextIndex];
      nextIndex += 1;
      if (options.signal.aborted) throw new DOMException('Request was cancelled.', 'AbortError');
      options.onBeforeDelay?.(task);
      if (task.delayMs > 0) await delay(task.delayMs, options.signal);
      if (options.signal.aborted) throw new DOMException('Request was cancelled.', 'AbortError');
      options.onBeforeRun?.(task);
      await options.run(task);
    }
  };

  const workerCount = Number.isFinite(maxConcurrency) ? Math.min(maxConcurrency, schedule.length) : schedule.length;
  await Promise.all(Array.from({ length: workerCount }, runOne));
}
