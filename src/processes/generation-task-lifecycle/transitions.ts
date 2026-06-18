import type { BatchGenerationItem, GenerationStatus, GenerationTask } from '../../domain/generationTask';
import { patchBatchItem } from '../../domain/generationSnapshots';

export interface LifecyclePatch {
  status: GenerationStatus;
  error?: string | null;
  updatedAt?: number;
}

function applyLifecyclePatch<T extends { status: GenerationStatus; error?: string | null; updatedAt?: number }>(entity: T, patch: LifecyclePatch): T {
  return {
    ...entity,
    status: patch.status,
    updatedAt: patch.updatedAt ?? Date.now(),
    ...(patch.error !== undefined ? { error: patch.error } : {})
  };
}

export function transitionTask(task: GenerationTask, patch: LifecyclePatch): GenerationTask {
  return applyLifecyclePatch(task, patch);
}

export function transitionBatchItem(item: BatchGenerationItem, patch: LifecyclePatch): BatchGenerationItem {
  return applyLifecyclePatch(item, patch);
}

export function transitionTaskBatchItem(task: GenerationTask, itemId: string, patch: LifecyclePatch): GenerationTask {
  return patchBatchItem(task, itemId, (item) => transitionBatchItem(item, patch));
}
