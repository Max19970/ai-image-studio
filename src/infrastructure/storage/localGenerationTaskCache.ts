import type { GenerationTask } from '../../domain/generationTask';
import type { GenerationTaskHistoryCache } from '../../entities/storage';
import { normalizeGenerationTasks, toLightGenerationTaskSnapshot } from '../../entities/storage';

export const generationTasksLocalCacheKey = 'image-studio.generation-tasks.v1';

export const localGenerationTaskCache: GenerationTaskHistoryCache = {
  loadSync() {
    try {
      const raw = localStorage.getItem(generationTasksLocalCacheKey);
      if (!raw) return [];
      return normalizeGenerationTasks(JSON.parse(raw), 80);
    } catch {
      return [];
    }
  },

  save(tasks: GenerationTask[]) {
    try {
      localStorage.setItem(generationTasksLocalCacheKey, JSON.stringify(toLightGenerationTaskSnapshot(tasks, 40)));
    } catch (error) {
      console.warn('Could not persist even the light generation history cache.', error);
    }
  },

  clear() {
    localStorage.removeItem(generationTasksLocalCacheKey);
  }
};
