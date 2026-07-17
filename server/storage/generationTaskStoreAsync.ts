import { fork, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type {
  GenerationTaskAssetMode,
  GenerationTaskHistoryLoadOptions,
  GenerationTaskHistoryStorageStats,
  GenerationTaskStorageAudit,
  GenerationTaskStorageDiagnostics,
  JsonObject
} from './generation-tasks/types';
import type {
  GenerationTaskStoreWorkerOperation,
  GenerationTaskStoreWorkerRequest,
  GenerationTaskStoreWorkerResponse,
  GenerationTaskStoreWorkerValue
} from './generationTaskStoreWorkerTypes';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

interface SerializedWorkerError {
  name: string;
  message: string;
  stack?: string;
}

let workerProcess: ChildProcess | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingRequest>();

function createWorkerError(error: SerializedWorkerError): Error {
  const created = new Error(error.message);
  created.name = error.name;
  if (error.stack) created.stack = error.stack;
  return created;
}

function rejectPending(error: Error) {
  for (const pending of pendingRequests.values()) pending.reject(error);
  pendingRequests.clear();
}

function resetWorkerProcess(error?: Error) {
  if (error) rejectPending(error);
  workerProcess?.removeAllListeners();
  workerProcess = null;
}

function createWorkerProcess(): ChildProcess {
  const modulePath = fileURLToPath(new URL('./generationTaskStoreProcess.ts', import.meta.url));
  const created = fork(modulePath, [], {
    execArgv: process.execArgv,
    stdio: ['ignore', 'ignore', 'inherit', 'ipc']
  });
  created.on('message', (response: GenerationTaskStoreWorkerResponse) => {
    const pending = pendingRequests.get(response.id);
    if (!pending) return;
    pendingRequests.delete(response.id);
    if (response.ok) pending.resolve(response.value);
    else pending.reject(createWorkerError(response.error));
  });
  created.on('error', (error) => resetWorkerProcess(error instanceof Error ? error : new Error(String(error))));
  created.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`;
    resetWorkerProcess(new Error(`Generation task store process exited with ${reason}.`));
  });
  return created;
}

function getWorkerProcess(): ChildProcess {
  if (workerProcess?.connected) return workerProcess;
  workerProcess = createWorkerProcess();
  return workerProcess;
}

function rejectRequest(id: number, error: Error) {
  const pending = pendingRequests.get(id);
  if (!pending) return;
  pendingRequests.delete(id);
  pending.reject(error);
}

function callWorker<T extends GenerationTaskStoreWorkerOperation['type']>(
  operation: Extract<GenerationTaskStoreWorkerOperation, { type: T }>
): Promise<GenerationTaskStoreWorkerValue<T>> {
  const id = nextRequestId++;
  const request: GenerationTaskStoreWorkerRequest = { id, operation };
  return new Promise((resolve, reject) => {
    const target = getWorkerProcess();
    if (!target.connected || typeof target.send !== 'function') {
      reject(new Error('Generation task store process is not connected.'));
      return;
    }

    pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject });
    target.send(request, (error) => {
      if (error) rejectRequest(id, error instanceof Error ? error : new Error(String(error)));
    });
  });
}

export function loadGenerationTaskHistoryDocumentsAsync(options: GenerationTaskHistoryLoadOptions = {}) {
  return callWorker({ type: 'loadHistory', options });
}

export function loadGenerationTaskRuntimeHistoryDocumentsAsync(
  completedLimit: number,
  assetMode: GenerationTaskAssetMode = 'metadata'
) {
  return callWorker({ type: 'loadRuntimeHistory', completedLimit, assetMode });
}

export function loadGenerationTaskHistoryDocumentsByIdsAsync(
  taskIds: string[],
  assetMode: GenerationTaskAssetMode = 'full'
) {
  return callWorker({ type: 'loadHistoryByIds', taskIds, assetMode });
}

export function saveGenerationTaskHistoryDocumentsAsync(tasks: unknown[]) {
  return callWorker({ type: 'saveHistory', tasks });
}

export function clearGenerationTaskHistoryDocumentsAsync(): Promise<GenerationTaskHistoryStorageStats> {
  return callWorker({ type: 'clearHistory' });
}

export function loadGenerationTaskAssetDocumentAsync(key: string): Promise<JsonObject | null> {
  return callWorker({ type: 'loadAsset', key });
}

export function getGenerationTaskStorageDiagnosticsAsync(): Promise<GenerationTaskStorageDiagnostics> {
  return callWorker({ type: 'diagnostics' });
}

export function auditGenerationTaskStorageDocumentsAsync(): Promise<GenerationTaskStorageAudit> {
  return callWorker({ type: 'audit' });
}

export async function closeGenerationTaskStoreWorkerForTests() {
  const current = workerProcess;
  resetWorkerProcess(new Error('Generation task store process closed for tests.'));
  if (!current) return;
  await new Promise<void>((resolve) => {
    current.once('exit', () => resolve());
    current.kill();
    setTimeout(resolve, 500).unref?.();
  });
}
