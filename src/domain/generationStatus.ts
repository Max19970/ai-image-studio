import { generationStatusFallbackModules } from './generationStatus.generated';
import type { BatchGenerationItem, GenerationStatus, GenerationTask } from './types';
import type { GenerationStatusDescriptor } from './generationStatusTypes';

export type { GenerationStatusDescriptor } from './generationStatusTypes';

function isGenerationStatusDescriptor(value: unknown): value is GenerationStatusDescriptor {
  const candidate = value as Partial<GenerationStatusDescriptor> | null;
  return Boolean(candidate?.status && typeof candidate.persisted === 'boolean' && typeof candidate.active === 'boolean' && typeof candidate.terminal === 'boolean' && candidate.uiTone && candidate.interruptedStatus);
}

export const generationStatusDescriptors: readonly GenerationStatusDescriptor[] = Object.values(generationStatusFallbackModules)
  .flatMap((module) => Object.values(module).filter(isGenerationStatusDescriptor))
  .sort((a, b) => a.status.localeCompare(b.status));

export const generationStatusDescriptorsByStatus: ReadonlyMap<string, GenerationStatusDescriptor> = new Map(generationStatusDescriptors.map((descriptor) => [descriptor.status, descriptor] as const));

export const GENERATION_LIFECYCLE_STATUSES = generationStatusDescriptors.map((descriptor) => descriptor.status);
export type GenerationLifecycleStatus = typeof GENERATION_LIFECYCLE_STATUSES[number];
export type PersistedGenerationStatus = Extract<GenerationLifecycleStatus, GenerationStatus>;

export const ACTIVE_GENERATION_STATUSES: readonly GenerationStatus[] = generationStatusDescriptors
  .filter((descriptor) => descriptor.active && descriptor.persisted)
  .map((descriptor) => descriptor.status as GenerationStatus);
export const TERMINAL_GENERATION_STATUSES: readonly GenerationStatus[] = generationStatusDescriptors
  .filter((descriptor) => descriptor.terminal && descriptor.persisted)
  .map((descriptor) => descriptor.status as GenerationStatus);

export function isGenerationStatus(value: unknown): value is GenerationStatus {
  return typeof value === 'string' && Boolean(generationStatusDescriptorsByStatus.get(value)?.persisted);
}

export function isActiveGenerationStatus(status: GenerationStatus) {
  return generationStatusDescriptorsByStatus.get(status)?.active === true;
}

export function isTerminalGenerationStatus(status: GenerationStatus) {
  return generationStatusDescriptorsByStatus.get(status)?.terminal === true;
}

export function normalizeGenerationStatus(status: unknown, fallback: GenerationStatus = 'failed'): GenerationStatus {
  if (status === 'streaming') return 'running';
  if (isGenerationStatus(status)) return status;
  return fallback;
}

export function interruptedStatusToFailed(status: GenerationStatus) {
  return generationStatusDescriptorsByStatus.get(status)?.interruptedStatus ?? status;
}

export function statusToUiTone(status: GenerationStatus): 'queued' | 'streaming' | 'succeeded' | 'failed' | 'cancelled' {
  return generationStatusDescriptorsByStatus.get(status)?.uiTone ?? 'failed';
}

export function taskHasActiveWork(task: GenerationTask) {
  return isActiveGenerationStatus(task.status);
}

export function batchItemHasActiveWork(item: BatchGenerationItem) {
  return isActiveGenerationStatus(item.status);
}
