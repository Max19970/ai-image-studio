import { isAbortError } from '../../../src/domain/asyncFlow';
import type { GeneratedImage, GenerationStatus, GenerationTask } from '../../../src/domain/generationTask';

export function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function normalizeError(error: unknown): string {
  if (isAbortError(error)) return 'Request was cancelled.';
  if (error instanceof Error) return error.message;
  return String(error || 'Generation failed.');
}

export function isActiveStatus(status: GenerationStatus): boolean {
  return status === 'queued' || status === 'sending' || status === 'running' || status === 'retrying';
}

export function transitionTask(task: GenerationTask, status: GenerationStatus, patch: Partial<GenerationTask> = {}): GenerationTask {
  return {
    ...task,
    ...patch,
    status,
    updatedAt: Date.now()
  };
}

export function sortImages(images: GeneratedImage[]) {
  return [...images].sort((a, b) => a.index - b.index || a.createdAt - b.createdAt);
}

function sameLiveImageSlot(left: GeneratedImage, right: GeneratedImage): boolean {
  return (left.batchItemId ?? null) === (right.batchItemId ?? null) && left.index === right.index;
}

export function upsertLiveImage(current: GeneratedImage[], next: GeneratedImage): GeneratedImage[] {
  if (next.kind === 'partial') {
    return sortImages([...current.filter((image) => image.kind !== 'partial' || (image.batchItemId ?? null) !== (next.batchItemId ?? null)), next]);
  }
  return sortImages([...current.filter((image) => image.kind !== 'partial' || !sameLiveImageSlot(image, next)), next]);
}

export function finalImages(images: GeneratedImage[]): GeneratedImage[] {
  return images.filter((image) => image.kind === 'final');
}

export function taskPersistableFinalImageCount(task: GenerationTask): number {
  const direct = task.images.filter((image) => image.kind === 'final' && Boolean(image.src || image.storageAssetKey)).length;
  const batch = task.batch?.items.reduce((total, item) => total + item.images.filter((image) => image.kind === 'final' && Boolean(image.src || image.storageAssetKey)).length, 0) ?? 0;
  return direct + batch;
}
