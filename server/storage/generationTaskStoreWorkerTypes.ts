import type {
  GenerationTaskAssetMode,
  GenerationTaskHistoryLoadOptions,
  GenerationTaskHistoryStorageStats,
  GenerationTaskStorageAudit,
  GenerationTaskStorageDiagnostics,
  JsonObject
} from './generation-tasks/types';

export type GenerationTaskStoreWorkerOperation =
  | { type: 'loadHistory'; options?: GenerationTaskHistoryLoadOptions }
  | { type: 'loadRuntimeHistory'; completedLimit: number; assetMode?: GenerationTaskAssetMode }
  | { type: 'saveHistory'; tasks: unknown[] }
  | { type: 'clearHistory' }
  | { type: 'loadAsset'; key: string }
  | { type: 'diagnostics' }
  | { type: 'audit' };

export interface GenerationTaskStoreWorkerRequest {
  id: number;
  operation: GenerationTaskStoreWorkerOperation;
}

export type GenerationTaskStoreWorkerValue<T extends GenerationTaskStoreWorkerOperation['type']> =
  T extends 'loadHistory' | 'loadRuntimeHistory' ? { tasks: unknown[]; stats: GenerationTaskHistoryStorageStats } :
  T extends 'saveHistory' ? ReturnType<typeof import('./generationTaskStore').saveGenerationTaskHistoryDocuments> :
  T extends 'clearHistory' ? GenerationTaskHistoryStorageStats :
  T extends 'loadAsset' ? JsonObject | null :
  T extends 'diagnostics' ? GenerationTaskStorageDiagnostics :
  T extends 'audit' ? GenerationTaskStorageAudit :
  never;

export type GenerationTaskStoreWorkerResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: { name: string; message: string; stack?: string } };
