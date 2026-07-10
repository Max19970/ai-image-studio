import { transitionTask } from './imageState';
import { reduceCancelledBatchItem } from './cancellationBatchReducer';
import { createGenerationCancellationRegistry } from './cancellationRegistry';
import { defaultGenerationCancellationTaskStore } from './cancellationTaskStore';

const cancellationRegistry = createGenerationCancellationRegistry();
const taskStore = defaultGenerationCancellationTaskStore;

export function registerTaskController(taskId: string, controller: AbortController) {
  cancellationRegistry.registerTaskController(taskId, controller);
}

export function unregisterTaskController(taskId: string) {
  cancellationRegistry.unregisterTaskController(taskId);
}

export function registerBatchItemController(taskId: string, itemId: string, controller: AbortController) {
  cancellationRegistry.registerBatchItemController(taskId, itemId, controller);
}

export function requestBatchItemCancellation(taskId: string, itemId: string) {
  cancellationRegistry.requestBatchItemCancellation(taskId, itemId);
}

export function isBatchItemCancellationRequested(taskId: string, itemId: string): boolean {
  return cancellationRegistry.isBatchItemCancellationRequested(taskId, itemId);
}

export function abortBatchItemController(taskId: string, itemId: string): boolean {
  return cancellationRegistry.abortBatchItemController(taskId, itemId);
}

export function abortBatchItemControllers(taskId: string) {
  cancellationRegistry.abortBatchItemControllers(taskId);
}

export function unregisterBatchItemController(taskId: string, itemId: string) {
  cancellationRegistry.unregisterBatchItemController(taskId, itemId);
}

export function clearBatchTaskRuntime(taskId: string) {
  cancellationRegistry.clearBatchTaskRuntime(taskId);
}

export async function deleteServerGenerationTask(taskId: string): Promise<void> {
  cancellationRegistry.abortTaskController(taskId);
  cancellationRegistry.unregisterTaskController(taskId);
  cancellationRegistry.abortBatchItemControllers(taskId);
  cancellationRegistry.clearBatchTaskRuntime(taskId);
  await taskStore.mutateTasks((tasks) => tasks.filter((task) => task.id !== taskId));
}

export async function clearServerGenerationTasks(): Promise<void> {
  cancellationRegistry.reset();
  await taskStore.mutateTasks(() => []);
}

export async function cancelServerGenerationTask(taskId: string): Promise<void> {
  if (!cancellationRegistry.abortTaskController(taskId)) return;
  cancellationRegistry.abortBatchItemControllers(taskId);
  await taskStore.patchTask(taskId, (task) => transitionTask(task, 'cancelled', { error: 'Request was cancelled.', progress: null }));
}

export async function cancelServerBatchGenerationItem(taskId: string, itemId: string): Promise<void> {
  const task = (await taskStore.ensureTasks()).find((candidate) => candidate.id === taskId);
  const item = task?.batch?.items.find((candidate) => candidate.id === itemId);
  if (!task || !item) throw new Error('Batch item not found.');
  if (item.status === 'succeeded' || item.status === 'failed' || item.status === 'cancelled') return;

  cancellationRegistry.requestBatchItemCancellation(taskId, itemId);
  cancellationRegistry.abortBatchItemController(taskId, itemId);
  await taskStore.patchTask(taskId, (current) => reduceCancelledBatchItem(current, itemId), { persist: false });
}

export function resetCancellationRuntimeForTests() {
  cancellationRegistry.reset();
}
