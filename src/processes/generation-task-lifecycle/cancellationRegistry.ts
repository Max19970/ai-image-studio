export interface TaskCancellationRegistry {
  register: (taskId: string, controller: AbortController) => void;
  release: (taskId: string) => void;
  cancel: (taskId: string) => boolean;
  cancelAll: () => void;
  activeCount: () => number;
}

export function createTaskCancellationRegistry(): TaskCancellationRegistry {
  const controllers = new Map<string, AbortController>();

  return {
    register(taskId, controller) {
      controllers.set(taskId, controller);
    },
    release(taskId) {
      controllers.delete(taskId);
    },
    cancel(taskId) {
      const controller = controllers.get(taskId);
      if (!controller) return false;
      controller.abort();
      controllers.delete(taskId);
      return true;
    },
    cancelAll() {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    },
    activeCount() {
      return controllers.size;
    }
  };
}
