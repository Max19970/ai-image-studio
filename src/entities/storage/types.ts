import type { GenerationTask } from '../../domain/generationTask';

export type StorageBackendKind = string & {};
export type GenerationTaskAssetLoadMode = 'full' | 'thumbnail' | 'metadata';

export interface StorageOperationResult {
  backend: StorageBackendKind;
  ok: boolean;
  warning?: string;
}

export interface StorageReadResult<T> extends StorageOperationResult {
  value: T;
}

export interface GenerationTaskHistoryLoadOptions {
  limit?: number;
  offset?: number;
  assetMode?: GenerationTaskAssetLoadMode;
}

export interface GenerationTaskHistoryCache {
  loadSync(): GenerationTask[];
  save(tasks: GenerationTask[]): void;
  clear(): void;
}

export interface GenerationTaskHistoryStore {
  load(options?: GenerationTaskHistoryLoadOptions): Promise<StorageReadResult<GenerationTask[]>>;
  save(tasks: GenerationTask[], limit?: number): Promise<StorageOperationResult>;
  clear(): Promise<StorageOperationResult>;
}
