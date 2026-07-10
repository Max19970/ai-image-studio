import type { GeneratedImage, GenerationTask } from '../../domain/generationTask';
import type { GenerationTaskHistoryLoadOptions, GenerationTaskHistoryStore, StorageOperationResult, StorageReadResult } from '../../entities/storage';
import { normalizeGenerationTasks } from '../../entities/storage';
import { setGenerationTaskCacheNamespace } from './localGenerationTaskCache';

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

function hashNamespace(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function readStorageNamespace(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const storage = (data as { storage?: unknown }).storage;
  if (!storage || typeof storage !== 'object') return null;
  const record = storage as Record<string, unknown>;
  const source = [record.backend, record.schemaVersion, record.dbPath]
    .map((value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '')
    .filter(Boolean)
    .join('|');
  return source ? hashNamespace(source) : null;
}

export async function loadGenerationTaskAsset(key: string): Promise<GeneratedImage | null> {
  const response = await fetchStorage(`${generationTaskAssetEndpoint}?key=${encodeURIComponent(key)}`);
  if (!response.ok) return null;
  const data = await response.json() as { image?: GeneratedImage | null };
  return data.image ?? null;
}

export const remoteGenerationTaskHistoryStore: GenerationTaskHistoryStore = {
  async load(options: GenerationTaskHistoryLoadOptions = {}): Promise<StorageReadResult<GenerationTask[]>> {
    const params = new URLSearchParams({
      limit: String(options.limit ?? 1000),
      offset: String(options.offset ?? 0),
      assetMode: options.assetMode ?? 'thumbnail'
    });
    const response = await fetchStorage(`${generationTasksStorageEndpoint}?${params}`);
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json() as { tasks?: unknown; storage?: unknown };
    setGenerationTaskCacheNamespace(readStorageNamespace(data));
    return {
      backend: 'remote-encrypted',
      ok: true,
      value: normalizeGenerationTasks(data.tasks, options.limit ?? 1000)
    };
  },

  async save(tasks: GenerationTask[]): Promise<StorageOperationResult> {
    const safeTasks = normalizeGenerationTasks(tasks, tasks.length || 1);
    const response = await fetchStorage(generationTasksStorageEndpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: safeTasks })
    });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json().catch(() => null);
    setGenerationTaskCacheNamespace(readStorageNamespace(data));
    return { backend: 'remote-encrypted', ok: true };
  },

  async clear(): Promise<StorageOperationResult> {
    const response = await fetchStorage(generationTasksStorageEndpoint, { method: 'DELETE' });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json().catch(() => null);
    setGenerationTaskCacheNamespace(readStorageNamespace(data));
    return { backend: 'remote-encrypted', ok: true };
  }
};
