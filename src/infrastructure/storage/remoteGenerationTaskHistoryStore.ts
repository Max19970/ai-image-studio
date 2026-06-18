import type { GeneratedImage, GenerationTask } from '../../domain/generationTask';
import type { GenerationTaskHistoryLoadOptions, GenerationTaskHistoryStore, StorageOperationResult, StorageReadResult } from '../../entities/storage';
import { normalizeGenerationTasks } from '../../entities/storage';

export const generationTasksStorageEndpoint = '/api/storage/generation-tasks';
export const generationTaskAssetEndpoint = '/api/storage/generation-task-asset';

async function fetchStorage(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach local storage backend. Make sure the Express server is running. ${message}`);
  }
}

export async function loadGenerationTaskAsset(key: string): Promise<GeneratedImage | null> {
  const response = await fetchStorage(`${generationTaskAssetEndpoint}?key=${encodeURIComponent(key)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json() as { image?: unknown };
  return data.image && typeof data.image === 'object' ? data.image as GeneratedImage : null;
}

export const remoteGenerationTaskHistoryStore: GenerationTaskHistoryStore = {
  async load(options: GenerationTaskHistoryLoadOptions = {}): Promise<StorageReadResult<GenerationTask[]>> {
    const params = new URLSearchParams({
      limit: String(options.limit ?? 120),
      offset: String(options.offset ?? 0),
      assetMode: options.assetMode ?? 'thumbnail'
    });
    const response = await fetchStorage(`${generationTasksStorageEndpoint}?${params}`);
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json() as { tasks?: unknown };
    return {
      backend: 'remote-encrypted',
      ok: true,
      value: normalizeGenerationTasks(data.tasks, options.limit ?? 120)
    };
  },

  async save(tasks: GenerationTask[]): Promise<StorageOperationResult> {
    const safeTasks = normalizeGenerationTasks(tasks, 120);
    const response = await fetchStorage(generationTasksStorageEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: safeTasks })
    });
    if (!response.ok) throw new Error(await response.text());
    return { backend: 'remote-encrypted', ok: true };
  },

  async clear(): Promise<StorageOperationResult> {
    const response = await fetchStorage(generationTasksStorageEndpoint, { method: 'DELETE' });
    if (!response.ok) throw new Error(await response.text());
    return { backend: 'remote-encrypted', ok: true };
  }
};
