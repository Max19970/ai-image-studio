export interface GenerationCancellationRegistry {
  registerTaskController(taskId: string, controller: AbortController): void;
  unregisterTaskController(taskId: string): void;
  registerBatchItemController(taskId: string, itemId: string, controller: AbortController): void;
  unregisterBatchItemController(taskId: string, itemId: string): void;
  requestBatchItemCancellation(taskId: string, itemId: string): void;
  isBatchItemCancellationRequested(taskId: string, itemId: string): boolean;
  abortTaskController(taskId: string): boolean;
  abortBatchItemController(taskId: string, itemId: string): boolean;
  abortBatchItemControllers(taskId: string): void;
  clearBatchTaskRuntime(taskId: string): void;
  abortAll(): void;
  reset(): void;
}

export function createGenerationCancellationRegistry(): GenerationCancellationRegistry {
  const taskControllers = new Map<string, AbortController>();
  const batchItemControllers = new Map<string, Map<string, AbortController>>();
  const batchItemCancellationRequests = new Map<string, Set<string>>();

  function batchItemControllerMap(taskId: string): Map<string, AbortController> {
    const current = batchItemControllers.get(taskId);
    if (current) return current;
    const next = new Map<string, AbortController>();
    batchItemControllers.set(taskId, next);
    return next;
  }

  function batchItemCancellationSet(taskId: string): Set<string> {
    const current = batchItemCancellationRequests.get(taskId);
    if (current) return current;
    const next = new Set<string>();
    batchItemCancellationRequests.set(taskId, next);
    return next;
  }

  function abortBatchItemControllers(taskId: string) {
    const controllers = batchItemControllers.get(taskId);
    if (!controllers) return;
    for (const controller of controllers.values()) controller.abort();
  }

  function clearBatchTaskRuntime(taskId: string) {
    batchItemControllers.delete(taskId);
    batchItemCancellationRequests.delete(taskId);
  }

  function abortAll() {
    for (const controller of taskControllers.values()) controller.abort();
    for (const taskId of batchItemControllers.keys()) abortBatchItemControllers(taskId);
  }

  return {
    registerTaskController(taskId, controller) {
      taskControllers.set(taskId, controller);
    },
    unregisterTaskController(taskId) {
      taskControllers.delete(taskId);
    },
    registerBatchItemController(taskId, itemId, controller) {
      if (this.isBatchItemCancellationRequested(taskId, itemId)) controller.abort();
      batchItemControllerMap(taskId).set(itemId, controller);
    },
    unregisterBatchItemController(taskId, itemId) {
      const controllers = batchItemControllers.get(taskId);
      if (!controllers) return;
      controllers.delete(itemId);
      if (controllers.size === 0) batchItemControllers.delete(taskId);
    },
    requestBatchItemCancellation(taskId, itemId) {
      batchItemCancellationSet(taskId).add(itemId);
    },
    isBatchItemCancellationRequested(taskId, itemId) {
      return batchItemCancellationRequests.get(taskId)?.has(itemId) ?? false;
    },
    abortTaskController(taskId) {
      const controller = taskControllers.get(taskId);
      controller?.abort();
      return Boolean(controller);
    },
    abortBatchItemController(taskId, itemId) {
      const controller = batchItemControllers.get(taskId)?.get(itemId);
      controller?.abort();
      return Boolean(controller);
    },
    abortBatchItemControllers,
    clearBatchTaskRuntime,
    abortAll,
    reset() {
      abortAll();
      taskControllers.clear();
      batchItemControllers.clear();
      batchItemCancellationRequests.clear();
    }
  };
}
