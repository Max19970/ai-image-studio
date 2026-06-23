import { reduceBatchTask } from '../../../src/processes/batch-runner/batchTaskReducer';
import { ensureRuntimeTasks, mutateTasks, patchTask } from './runtimeStore';
import { transitionTask } from './imageState';

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

export function registerTaskController(taskId: string, controller: AbortController) {
  taskControllers.set(taskId, controller);
}

export function unregisterTaskController(taskId: string) {
  taskControllers.delete(taskId);
}

export function registerBatchItemController(taskId: string, itemId: string, controller: AbortController) {
  if (isBatchItemCancellationRequested(taskId, itemId)) controller.abort();
  batchItemControllerMap(taskId).set(itemId, controller);
}

export function requestBatchItemCancellation(taskId: string, itemId: string) {
  batchItemCancellationSet(taskId).add(itemId);
}

export function isBatchItemCancellationRequested(taskId: string, itemId: string): boolean {
  return batchItemCancellationRequests.get(taskId)?.has(itemId) ?? false;
}

export function abortBatchItemController(taskId: string, itemId: string): boolean {
  const controller = batchItemControllers.get(taskId)?.get(itemId);
  controller?.abort();
  return Boolean(controller);
}

export function abortBatchItemControllers(taskId: string) {
  const controllers = batchItemControllers.get(taskId);
  if (!controllers) return;
  for (const controller of controllers.values()) controller.abort();
}

export function unregisterBatchItemController(taskId: string, itemId: string) {
  const controllers = batchItemControllers.get(taskId);
  if (!controllers) return;
  controllers.delete(itemId);
  if (controllers.size === 0) batchItemControllers.delete(taskId);
}

export function clearBatchTaskRuntime(taskId: string) {
  batchItemControllers.delete(taskId);
  batchItemCancellationRequests.delete(taskId);
}

export async function deleteServerGenerationTask(taskId: string): Promise<void> {
  taskControllers.get(taskId)?.abort();
  taskControllers.delete(taskId);
  abortBatchItemControllers(taskId);
  clearBatchTaskRuntime(taskId);
  await mutateTasks((tasks) => tasks.filter((task) => task.id !== taskId));
}

export async function clearServerGenerationTasks(): Promise<void> {
  for (const controller of taskControllers.values()) controller.abort();
  for (const taskId of batchItemControllers.keys()) abortBatchItemControllers(taskId);
  taskControllers.clear();
  batchItemControllers.clear();
  batchItemCancellationRequests.clear();
  await mutateTasks(() => []);
}

export async function cancelServerGenerationTask(taskId: string): Promise<void> {
  const controller = taskControllers.get(taskId);
  if (!controller) return;
  controller.abort();
  abortBatchItemControllers(taskId);
  await patchTask(taskId, (task) => transitionTask(task, 'cancelled', { error: 'Request was cancelled.', progress: null }));
}

export async function cancelServerBatchGenerationItem(taskId: string, itemId: string): Promise<void> {
  const task = ensureRuntimeTasks().find((candidate) => candidate.id === taskId);
  const item = task?.batch?.items.find((candidate) => candidate.id === itemId);
  if (!task || !item) throw new Error('Batch item not found.');
  if (item.status === 'succeeded' || item.status === 'failed' || item.status === 'cancelled') return;

  requestBatchItemCancellation(taskId, itemId);
  abortBatchItemController(taskId, itemId);
  await patchTask(taskId, (current) => reduceBatchTask(current, {
    type: 'item-cancelled',
    itemId,
    error: 'Request was cancelled.',
    aggregateError: null
  }), { persist: false });
}

export function resetCancellationRuntimeForTests() {
  for (const controller of taskControllers.values()) controller.abort();
  for (const taskId of batchItemControllers.keys()) abortBatchItemControllers(taskId);
  taskControllers.clear();
  batchItemControllers.clear();
  batchItemCancellationRequests.clear();
}
