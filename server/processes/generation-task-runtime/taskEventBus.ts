import type express from 'express';
import type { GenerationTask } from '../../../src/domain/generationTask';
import { createTasksDelta, createTaskUpsertDelta, isEmptyTasksDelta } from './taskEventDelta';
import { sseTaskEventTransport, type TaskEventClient, type TaskEventTransport } from './taskEventTransport';

export interface GenerationTaskEventBus {
  hasClients(): boolean;
  nextRevision(): number;
  broadcastTasksDelta(previousTasks: GenerationTask[], nextTasks: GenerationTask[], revision: number): void;
  broadcastTaskUpsert(task: GenerationTask, revision: number, taskIds: string[]): void;
  subscribe(req: express.Request, res: express.Response, getSnapshot: () => GenerationTask[]): void;
  resetForTests(): void;
}

export function createGenerationTaskEventBus(transport: TaskEventTransport = sseTaskEventTransport): GenerationTaskEventBus {
  const clients = new Set<TaskEventClient>();
  let revision = 0;

  return {
    hasClients() {
      return clients.size > 0;
    },
    nextRevision() {
      revision += 1;
      return revision;
    },
    broadcastTasksDelta(previousTasks, nextTasks, nextRevision) {
      if (clients.size === 0) return;
      const delta = createTasksDelta(previousTasks, nextTasks, nextRevision);
      if (isEmptyTasksDelta(delta)) return;
      for (const client of clients) transport.send(client, 'tasks-delta', delta);
    },
    broadcastTaskUpsert(task, nextRevision, taskIds) {
      if (clients.size === 0) return;
      const delta = createTaskUpsertDelta(task, nextRevision, taskIds);
      for (const client of clients) transport.send(client, 'tasks-delta', delta);
    },
    subscribe(req, res, getSnapshot) {
      transport.prepare(res);
      clients.add(res);
      transport.send(res, 'tasks', { revision, tasks: getSnapshot() });

      const keepAlive = setInterval(() => {
        if (!res.writableEnded) transport.sendKeepAlive(res);
      }, 25_000);

      req.on('close', () => {
        clearInterval(keepAlive);
        clients.delete(res);
      });
    },
    resetForTests() {
      revision = 0;
      for (const client of clients) client.end();
      clients.clear();
    }
  };
}
