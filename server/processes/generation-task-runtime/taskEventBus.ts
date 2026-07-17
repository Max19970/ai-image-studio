import type express from 'express';
import type { GenerationTask } from '../../../src/domain/generationTask';
import type { GenerationTasksDeltaEvent, GenerationTasksEvent } from '../../../src/domain/generationTaskEvents';
import { createTasksDelta, createTaskUpsertDelta, isEmptyTasksDelta } from './taskEventDelta';
import { sseTaskEventTransport, type TaskEventClient, type TaskEventTransport } from './taskEventTransport';

interface BufferedTaskEvent {
  event: 'tasks-delta';
  data: GenerationTasksDeltaEvent;
}

interface TaskEventSubscriber {
  client: TaskEventClient;
  state: 'buffering' | 'live';
  buffer: BufferedTaskEvent[];
}

export interface GenerationTaskEventBus {
  hasClients(): boolean;
  currentRevision(): number;
  nextRevision(): number;
  broadcastTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number): void;
  broadcastTaskUpsert(task: GenerationTask, revision: number, taskIds?: string[]): void;
  subscribe(req: express.Request, res: express.Response, getSnapshot: () => Promise<GenerationTasksEvent>): void;
  resetForTests(): void;
}

export function createGenerationTaskEventBus(transport: TaskEventTransport = sseTaskEventTransport): GenerationTaskEventBus {
  const subscribers = new Map<TaskEventClient, TaskEventSubscriber>();
  let revision = 0;

  function publishDelta(delta: GenerationTasksDeltaEvent) {
    for (const subscriber of subscribers.values()) {
      if (subscriber.state === 'buffering') {
        subscriber.buffer.push({ event: 'tasks-delta', data: delta });
      } else if (!subscriber.client.writableEnded) {
        transport.send(subscriber.client, 'tasks-delta', delta);
      }
    }
  }

  return {
    hasClients() {
      return subscribers.size > 0;
    },
    currentRevision() {
      return revision;
    },
    nextRevision() {
      revision += 1;
      return revision;
    },
    broadcastTasksDelta(previousTasks, nextTasks, nextRevision) {
      if (subscribers.size === 0) return;
      const delta = createTasksDelta(previousTasks, nextTasks, nextRevision);
      if (!isEmptyTasksDelta(delta)) publishDelta(delta);
    },
    broadcastTaskUpsert(task, nextRevision, taskIds) {
      if (subscribers.size === 0) return;
      publishDelta(createTaskUpsertDelta(task, nextRevision, taskIds));
    },
    subscribe(req, res, getSnapshot) {
      transport.prepare(res);
      const subscriber: TaskEventSubscriber = {
        client: res,
        state: 'buffering',
        buffer: []
      };
      subscribers.set(res, subscriber);

      void getSnapshot()
        .then((snapshot) => {
          if (res.writableEnded || !subscribers.has(res)) return;
          transport.send(res, 'tasks', snapshot);
          const pendingEvents = subscriber.buffer
            .filter((event) => event.data.revision > snapshot.revision)
            .sort((left, right) => left.data.revision - right.data.revision);
          subscriber.buffer = [];
          for (const event of pendingEvents) {
            if (res.writableEnded || !subscribers.has(res)) return;
            transport.send(res, event.event, event.data);
          }
          subscriber.state = 'live';
        })
        .catch((error) => {
          console.error('[generation-task-runtime] failed to create task event snapshot:', error);
          if (!res.writableEnded && subscribers.has(res)) {
            transport.send(res, 'tasks-error', { message: error instanceof Error ? error.message : String(error) });
          }
          subscribers.delete(res);
        });

      const keepAlive = setInterval(() => {
        if (!res.writableEnded && subscribers.has(res)) transport.sendKeepAlive(res);
      }, 25_000);
      keepAlive.unref?.();

      req.on('close', () => {
        clearInterval(keepAlive);
        subscribers.delete(res);
      });
    },
    resetForTests() {
      revision = 0;
      for (const subscriber of subscribers.values()) subscriber.client.end();
      subscribers.clear();
    }
  };
}
