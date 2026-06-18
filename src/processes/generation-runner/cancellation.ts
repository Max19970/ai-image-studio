import type { RunnerTranslateFn, TaskHistoryPort } from './types';

export interface RunnerFailure {
  message: string;
  cancelled: boolean;
  raw: unknown;
}

export function createRunnerAbortController(taskId: string, taskHistory: TaskHistoryPort): AbortController {
  const controller = new AbortController();
  taskHistory.registerAborter(taskId, controller);
  return controller;
}

export function releaseRunnerAbortController(taskId: string, taskHistory: TaskHistoryPort) {
  taskHistory.releaseAborter(taskId);
}

export function isRunnerAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function normalizeRunnerFailure(error: unknown, t: RunnerTranslateFn): RunnerFailure {
  const cancelled = isRunnerAbortError(error);
  return {
    cancelled,
    raw: error,
    message: cancelled ? t('app.cancelled') : error instanceof Error ? error.message : String(error)
  };
}
