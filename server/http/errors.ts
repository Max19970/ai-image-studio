import type express from 'express';
import { HttpError, compactCause } from '../providers/types';

export async function proxyResponse(upstream: Response, res: express.Response) {
  const contentType = upstream.headers.get('content-type') || '';
  res.status(upstream.status);

  if (contentType.includes('text/event-stream')) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
  } else {
    res.setHeader('Content-Type', contentType || 'application/json; charset=utf-8');
  }

  if (!upstream.body) {
    res.end();
    return;
  }

  const reader = upstream.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(Buffer.from(value));
  }
  res.end();
}

export function sendServerError(res: express.Response, error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);
  const details = compactCause(error);
  const responseStatus = error instanceof HttpError ? error.statusCode : status;
  res.status(responseStatus).json({ error: details ? { message, details } : { message } });
}
