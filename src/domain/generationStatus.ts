import type { BatchGenerationItem, GenerationStatus, GenerationTask } from './types';

export const GENERATION_LIFECYCLE_STATUSES = [
  'created',
  'queued',
  'sending',
  'running',
  'retrying',
  'succeeded',
  'failed',
  'cancelled',
  'deleted'
] as const;

export type GenerationLifecycleStatus = typeof GENERATION_LIFECYCLE_STATUSES[number];
export type PersistedGenerationStatus = Exclude<GenerationLifecycleStatus, 'deleted'>;

export const ACTIVE_GENERATION_STATUSES: readonly GenerationStatus[] = ['created', 'queued', 'sending', 'running', 'retrying'];
export const TERMINAL_GENERATION_STATUSES: readonly GenerationStatus[] = ['succeeded', 'failed', 'cancelled'];

export function isGenerationStatus(value: unknown): value is GenerationStatus {
  return typeof value === 'string' && (GENERATION_LIFECYCLE_STATUSES as readonly string[]).includes(value) && value !== 'deleted';
}

export function isActiveGenerationStatus(status: GenerationStatus) {
  return (ACTIVE_GENERATION_STATUSES as readonly string[]).includes(status);
}

export function isTerminalGenerationStatus(status: GenerationStatus) {
  return (TERMINAL_GENERATION_STATUSES as readonly string[]).includes(status);
}

export function normalizeGenerationStatus(status: unknown, fallback: GenerationStatus = 'failed'): GenerationStatus {
  if (status === 'streaming') return 'running';
  if (isGenerationStatus(status)) return status;
  return fallback;
}

export function interruptedStatusToFailed(status: GenerationStatus) {
  return isActiveGenerationStatus(status) ? 'failed' : status;
}

export function statusToUiTone(status: GenerationStatus): 'queued' | 'streaming' | 'succeeded' | 'failed' | 'cancelled' {
  if (status === 'succeeded') return 'succeeded';
  if (status === 'failed') return 'failed';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'running' || status === 'sending' || status === 'retrying') return 'streaming';
  return 'queued';
}

export function taskHasActiveWork(task: GenerationTask) {
  return isActiveGenerationStatus(task.status);
}

export function batchItemHasActiveWork(item: BatchGenerationItem) {
  return isActiveGenerationStatus(item.status);
}
