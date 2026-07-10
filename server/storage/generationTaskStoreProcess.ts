import {
  auditGenerationTaskStorageDocuments,
  clearGenerationTaskHistoryDocuments,
  getGenerationTaskStorageDiagnostics,
  loadGenerationTaskAssetDocument,
  loadGenerationTaskHistoryDocuments,
  saveGenerationTaskHistoryDocuments
} from './generationTaskStore';
import type { GenerationTaskStoreWorkerRequest, GenerationTaskStoreWorkerResponse } from './generationTaskStoreWorkerTypes';

function serializeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, ...(error.stack ? { stack: error.stack } : {}) };
  }
  return { name: 'Error', message: String(error) };
}

function handleRequest(request: GenerationTaskStoreWorkerRequest): unknown {
  switch (request.operation.type) {
    case 'loadHistory':
      return loadGenerationTaskHistoryDocuments(request.operation.options ?? {});
    case 'saveHistory':
      return saveGenerationTaskHistoryDocuments(request.operation.tasks);
    case 'clearHistory':
      return clearGenerationTaskHistoryDocuments();
    case 'loadAsset':
      return loadGenerationTaskAssetDocument(request.operation.key);
    case 'diagnostics':
      return getGenerationTaskStorageDiagnostics();
    case 'audit':
      return auditGenerationTaskStorageDocuments();
    default: {
      const neverOperation: never = request.operation;
      throw new Error(`Unsupported generation task store operation: ${JSON.stringify(neverOperation)}`);
    }
  }
}

process.on('message', (request: GenerationTaskStoreWorkerRequest) => {
  const response: GenerationTaskStoreWorkerResponse = (() => {
    try {
      return { id: request.id, ok: true, value: handleRequest(request) };
    } catch (error) {
      return { id: request.id, ok: false, error: serializeError(error) };
    }
  })();
  process.send?.(response);
});
