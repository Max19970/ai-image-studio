import type express from 'express';
import { resetCancellationRuntimeForTests } from './cancellation';
import { resetRuntimeStoreForTests, clientSnapshotEvent, waitForRuntimeTaskPersistenceForTests } from './runtimeStore';
import { resetTaskEventsForTests, subscribeGenerationTaskEvents as subscribeTaskEvents } from './taskEvents';

export { startServerGenerationRun } from './singleRun';
export { startServerBatchGenerationRun } from './batchRun';
export {
  cancelServerBatchGenerationItem,
  cancelServerGenerationTask,
  clearServerGenerationTasks,
  deleteServerGenerationTask
} from './cancellation';
export type { ServerGenerationRunInput } from './providerPipeline';
export type { ServerBatchGenerationRunInput } from './batchRun';

export function resetGenerationTaskRuntimeForTests() {
  resetCancellationRuntimeForTests();
  resetRuntimeStoreForTests();
  resetTaskEventsForTests();
}

export { waitForRuntimeTaskPersistenceForTests };

export function subscribeGenerationTaskEvents(req: express.Request, res: express.Response) {
  subscribeTaskEvents(req, res, clientSnapshotEvent);
}
