import type express from 'express';

export type TaskEventClient = express.Response;

export interface TaskEventTransport {
  prepare(res: TaskEventClient): void;
  send(client: TaskEventClient, event: string, data: unknown): void;
  sendKeepAlive(client: TaskEventClient): void;
}

export const sseTaskEventTransport: TaskEventTransport = {
  prepare(res) {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
  },
  send(client, event, data) {
    client.write(`event: ${event}\n`);
    client.write(`data: ${JSON.stringify(data)}\n\n`);
  },
  sendKeepAlive(client) {
    client.write(': keep-alive\n\n');
  }
};
