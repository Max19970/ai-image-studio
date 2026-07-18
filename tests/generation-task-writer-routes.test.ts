import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import multer from 'multer';
import type { GenerationTaskRuntimePort } from '../server/processes/generation-task-runtime/runtimePort';
import { registerGenerationTaskRoutes } from '../server/routes/generation/taskRoutes';
import { registerGenerationTaskHistoryRoutes } from '../server/routes/generationTaskHistoryRoutes';
import { createBackendAppContext } from '../server/appContext';
import { createImageStudioApp } from '../server/app';

async function withServer(app: express.Express, run: (baseUrl: string) => Promise<void>) {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function createRuntimeSpy() {
  const calls = { clear: 0, remove: [] as string[] };
  const runtime: GenerationTaskRuntimePort = {
    subscribeEvents() {},
    async startSingle() { throw new Error('not used'); },
    async startBatch() { throw new Error('not used'); },
    async clearAll() { calls.clear += 1; },
    async removeOne(taskId) { calls.remove.push(taskId); },
    async stopTask() {},
    async stopBatchItem() {}
  };
  return { runtime, calls };
}

test('raw generation task storage writes are rejected with Allow GET', async () => {
  const app = express();
  app.use(express.json());
  registerGenerationTaskHistoryRoutes(app);

  await withServer(app, async (baseUrl) => {
    const put = await fetch(`${baseUrl}/api/storage/generation-tasks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: [] })
    });
    assert.equal(put.status, 405);
    assert.equal(put.headers.get('allow'), 'GET');
    assert.match(await put.text(), /runtime|read-only|method/i);

    const remove = await fetch(`${baseUrl}/api/storage/generation-tasks`, { method: 'DELETE' });
    assert.equal(remove.status, 405);
    assert.equal(remove.headers.get('allow'), 'GET');
  });
});

test('backend app context injects the canonical generation runtime into registered routes', async () => {
  const { runtime, calls } = createRuntimeSpy();
  const context = { ...createBackendAppContext(), generationTasks: runtime };

  await withServer(createImageStudioApp(context), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/generation-tasks/context-task`, { method: 'DELETE' });
    assert.equal(response.status, 204);
  });

  assert.deepEqual(calls.remove, ['context-task']);
});

test('canonical and legacy destructive task routes delegate to the same runtime port', async () => {
  const app = express();
  app.use(express.json());
  const { runtime, calls } = createRuntimeSpy();
  registerGenerationTaskRoutes(app, multer({ storage: multer.memoryStorage() }), runtime);

  await withServer(app, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/generation-tasks/task-a`, { method: 'DELETE' })).status, 204);
    assert.equal((await fetch(`${baseUrl}/api/generation-tasks/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 'task-b' })
    })).status, 204);
    assert.equal((await fetch(`${baseUrl}/api/generation-tasks`, { method: 'DELETE' })).status, 204);
    assert.equal((await fetch(`${baseUrl}/api/generation-tasks/clear`, { method: 'POST' })).status, 204);
  });

  assert.deepEqual(calls.remove, ['task-a', 'task-b']);
  assert.equal(calls.clear, 2);
});
