import type { GenerationTask } from '../../domain/generationTask';
import type { GenerationTaskHistoryCache } from '../../entities/storage';
import { normalizeGenerationTasks, toLightGenerationTaskSnapshot } from '../../entities/storage';

export const generationTasksLocalCacheKey = 'image-studio.generation-tasks.v1';

let runtimeNamespace: string | null = null;

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined';
}

function sanitizeNamespace(value: string | null | undefined): string | null {
  const safe = value?.trim().replace(/[^a-z0-9._-]/gi, '-').slice(0, 96);
  return safe || null;
}

function getNamespacedCacheKey(): string | null {
  const namespace = sanitizeNamespace(runtimeNamespace);
  return namespace ? `${generationTasksLocalCacheKey}.${namespace}` : null;
}

export function setGenerationTaskCacheNamespace(namespace: string | null | undefined) {
  runtimeNamespace = sanitizeNamespace(namespace);
}

export const localGenerationTaskCache: GenerationTaskHistoryCache = {
  loadSync() {
    const key = getNamespacedCacheKey();
    if (!key) return [];
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      return normalizeGenerationTasks(JSON.parse(raw), 80);
    } catch {
      return [];
    }
  },

  save(tasks: GenerationTask[]) {
    const key = getNamespacedCacheKey();
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify(toLightGenerationTaskSnapshot(tasks, 40)));
    } catch (error) {
      console.warn('Could not persist even the light generation history cache.', error);
    }
  },

  clear() {
    const key = getNamespacedCacheKey();
    try {
      if (key) localStorage.removeItem(key);
      localStorage.removeItem(generationTasksLocalCacheKey);
    } catch {
      // Ignore local cleanup failures.
    }
  }
};
