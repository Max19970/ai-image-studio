import type { GenerationRequestSnapshot, GenerationTask } from '../../domain/generationTask';
import { normalizeGalleryPath } from '../../domain/galleryFilesystem';
import type { ProviderGenerationModeDefinition } from '../../domain/providerMode';
import type { ProviderSettings } from '../../domain/providerSettings';
import type { WorkMode } from '../../domain/workMode';
import { getProviderAdapterForSettings } from '../../entities/provider/registry';
import { fetchProxy, readJsonOrThrow } from './common';

export interface SubmitRequest {
  provider: ProviderSettings;
  payload: Record<string, unknown>;
  mode: WorkMode;
  providerMode?: ProviderGenerationModeDefinition | null;
  targetImage?: File | null;
  referenceImages?: File[];
  mask?: File | null;
  galleryPath?: string;
}

export interface ServerBatchGenerationItemRequest {
  provider: ProviderSettings;
  payload: Record<string, unknown>;
  providerMode?: ProviderGenerationModeDefinition | null;
  snapshot: GenerationRequestSnapshot;
  targetImage?: File | null;
  referenceImages?: File[];
  mask?: File | null;
  retryAttempts?: number;
  retryDelaySeconds?: number;
}

export interface ServerBatchGenerationRequest {
  items: ServerBatchGenerationItemRequest[];
  intervalMs: number;
  aggregateSnapshot?: GenerationRequestSnapshot | null;
  galleryPath?: string;
}

function withServerTaskSnapshot(init: RequestInit, snapshot: GenerationRequestSnapshot): RequestInit {
  const body = init.body;
  if (body instanceof FormData) {
    const form = new FormData();
    body.forEach((value, key) => form.append(key, value));
    form.append('snapshot', JSON.stringify(snapshot));
    return { ...init, body: form };
  }

  const parsed = typeof body === 'string' ? JSON.parse(body) : {};
  return {
    ...init,
    body: JSON.stringify({ ...parsed, snapshot })
  };
}

function withServerGalleryPath(init: RequestInit, galleryPath: string | undefined): RequestInit {
  const normalized = normalizeGalleryPath(galleryPath);
  const body = init.body;
  if (body instanceof FormData) {
    const form = new FormData();
    body.forEach((value, key) => form.append(key, value));
    form.append('galleryPath', normalized);
    return { ...init, body: form };
  }
  const parsed = typeof body === 'string' ? JSON.parse(body) : {};
  return {
    ...init,
    body: JSON.stringify({ ...parsed, galleryPath: normalized })
  };
}

export async function enqueueServerGenerationRequest(request: SubmitRequest & { snapshot: GenerationRequestSnapshot }): Promise<{ taskId: string; task?: GenerationTask }> {
  const adapter = getProviderAdapterForSettings(request.provider);
  const proxyRequest = adapter.request.createSubmitProxyRequest(request);
  const init = withServerGalleryPath(withServerTaskSnapshot(proxyRequest.init, request.snapshot), request.galleryPath);
  const raw = await readJsonOrThrow(await fetchProxy('/api/generation-tasks/run', init));
  const data = raw && typeof raw === 'object' ? raw as { taskId?: unknown; task?: unknown } : {};
  if (typeof data.taskId !== 'string') throw new Error('Server generation runner returned an invalid task id.');
  return { taskId: data.taskId, task: data.task as GenerationTask | undefined };
}

function appendBatchItemFiles(form: FormData, index: number, item: ServerBatchGenerationItemRequest) {
  if (item.targetImage) form.append(`item_${index}_image_target`, item.targetImage, item.targetImage.name);
  (item.referenceImages ?? []).forEach((file) => form.append(`item_${index}_image_reference`, file, file.name));
  if (item.mask) form.append(`item_${index}_mask`, item.mask, item.mask.name);
}

export async function enqueueServerBatchGenerationRequest(request: ServerBatchGenerationRequest): Promise<{ taskId: string; task?: GenerationTask }> {
  const form = new FormData();
  const items = request.items.map((item, index) => {
    appendBatchItemFiles(form, index, item);
    return {
      provider: item.provider,
      payload: item.payload,
      providerModeId: item.providerMode?.id ?? null,
      transport: item.providerMode?.submit ?? null,
      snapshot: item.snapshot,
      retryAttempts: item.retryAttempts ?? 0,
      retryDelaySeconds: item.retryDelaySeconds ?? 0
    };
  });
  form.append('items', JSON.stringify(items));
  form.append('intervalMs', String(request.intervalMs));
  if (request.aggregateSnapshot) form.append('aggregateSnapshot', JSON.stringify(request.aggregateSnapshot));
  form.append('galleryPath', normalizeGalleryPath(request.galleryPath));

  const raw = await readJsonOrThrow(await fetchProxy('/api/generation-tasks/batch', { method: 'POST', body: form }));
  const data = raw && typeof raw === 'object' ? raw as { taskId?: unknown; task?: unknown } : {};
  if (typeof data.taskId !== 'string') throw new Error('Server batch runner returned an invalid task id.');
  return { taskId: data.taskId, task: data.task as GenerationTask | undefined };
}

export async function deleteServerGenerationTask(taskId: string): Promise<void> {
  await readJsonOrThrow(await fetchProxy('/api/generation-tasks/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId })
  }));
}

export async function clearServerGenerationTasks(): Promise<void> {
  await readJsonOrThrow(await fetchProxy('/api/generation-tasks/clear', { method: 'POST' }));
}

export async function cancelServerGenerationTask(taskId: string): Promise<void> {
  await readJsonOrThrow(await fetchProxy(`/api/generation-tasks/${encodeURIComponent(taskId)}/cancel`, { method: 'POST' }));
}

export async function cancelServerBatchGenerationItem(taskId: string, itemId: string): Promise<void> {
  await readJsonOrThrow(await fetchProxy(`/api/generation-tasks/${encodeURIComponent(taskId)}/batch-items/${encodeURIComponent(itemId)}/cancel`, { method: 'POST' }));
}
