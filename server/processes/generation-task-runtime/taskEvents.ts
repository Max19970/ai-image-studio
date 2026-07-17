import type express from 'express';
import type { GenerationTask } from '../../../src/domain/generationTask';
import type { GenerationTasksEvent } from '../../../src/domain/generationTaskEvents';
import { createGenerationTaskEventBus } from './taskEventBus';
export type { GenerationTasksDeltaEvent } from './taskEventDelta';

const defaultTaskEventBus = createGenerationTaskEventBus();

export function hasTaskEventClients(): boolean {
  return defaultTaskEventBus.hasClients();
}

export function currentTaskEventsRevision(): number {
  return defaultTaskEventBus.currentRevision();
}

export function nextTaskEventsRevision(): number {
  return defaultTaskEventBus.nextRevision();
}

export function broadcastTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number) {
  defaultTaskEventBus.broadcastTasksDelta(previousTasks, nextTasks, revision);
}

export function broadcastTaskUpsert(task: GenerationTask, revision: number, taskIds?: string[]) {
  defaultTaskEventBus.broadcastTaskUpsert(task, revision, taskIds);
}

export function subscribeGenerationTaskEvents(
  req: express.Request,
  res: express.Response,
  getSnapshot: () => Promise<GenerationTasksEvent>
) {
  defaultTaskEventBus.subscribe(req, res, getSnapshot);
}

export function resetTaskEventsForTests() {
  defaultTaskEventBus.resetForTests();
}
