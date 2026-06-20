import type { BatchGenerationItem, GeneratedImage, GenerationRequestSnapshot, GenerationTask, ImageParams } from './types';

export function cloneParams(params: ImageParams): ImageParams {
  return {
    ...params,
    providerParams: params.providerParams ? Object.fromEntries(
      Object.entries(params.providerParams).map(([key, value]) => [key, { ...value }])
    ) : undefined
  };
}

export function attachSnapshot(images: GeneratedImage[], snapshot: GenerationRequestSnapshot, taskId: string): GeneratedImage[] {
  return images.map((image) => ({ ...image, taskId, request: snapshot }));
}

export function attachBatchSnapshot(images: GeneratedImage[], snapshot: GenerationRequestSnapshot, taskId: string, itemId: string, itemIndex: number, startIndex: number): GeneratedImage[] {
  return images.map((image, offset) => ({
    ...image,
    index: startIndex + offset,
    taskId,
    batchItemId: itemId,
    batchItemIndex: itemIndex,
    request: snapshot
  }));
}

export function patchBatchItem(task: GenerationTask, itemId: string, recipe: (item: BatchGenerationItem) => BatchGenerationItem): GenerationTask {
  if (!task.batch) return task;
  return {
    ...task,
    batch: {
      ...task.batch,
      items: task.batch.items.map((item) => item.id === itemId ? recipe(item) : item)
    }
  };
}

export function getStatusText(task: GenerationTask | null, t: (key: string, vars?: Record<string, string | number | boolean | null | undefined>) => string) {
  if (!task) return null;
  if (task.kind === 'batch') {
    if (task.status === 'created' || task.status === 'queued') return t('app.status.batchQueued');
    if (task.status === 'sending' || task.status === 'running' || task.status === 'retrying') {
      return t('app.status.batchRunning', { done: task.images.length, total: expectedImageCount(task) });
    }
    if (task.status === 'failed') return t('app.status.failed', { error: task.error || t('app.errorUnknown') });
    if (task.status === 'cancelled') return t('app.status.cancelled');
    return t('app.status.batchDone', { count: task.images.length });
  }
  if (task.status === 'created' || task.status === 'queued') return t('app.status.queued');
  if (task.status === 'sending') return t('app.status.sending');
  if (task.status === 'running' || task.status === 'retrying') return t('app.status.streaming', { count: task.images.length });
  if (task.status === 'failed') return t('app.status.failed', { error: task.error || t('app.errorUnknown') });
  if (task.status === 'cancelled') return t('app.status.cancelled');
  return t('app.status.done', { count: task.images.length });
}

export function expectedImageCount(task: GenerationTask): number {
  if (task.batch) {
    return task.batch.items.reduce((sum, item) => sum + Math.max(1, Number(item.request.payload.n ?? item.request.params.n ?? 1)), 0);
  }
  return Math.max(1, Number(task.request.payload.n ?? task.request.params.n ?? 1));
}
