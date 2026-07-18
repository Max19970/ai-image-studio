import type { GenerationTask } from '../../domain/generationTask';

export interface GenerationTaskHistoryCache {
  loadSync(): GenerationTask[];
  save(tasks: GenerationTask[]): void;
  clear(): void;
}
