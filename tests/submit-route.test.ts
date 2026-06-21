import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createImageStudioApp } from '../server/app';
import { resetGenerationTaskRuntimeForTests } from '../server/processes/generationTaskRuntime';
import type { ProviderSettings } from '../server/providers/types';

const provider: ProviderSettings = {
  adapterId: 'openai-compatible',
  generationEndpoint: 'https://provider.test/v1/images/generations',
  editEndpoint: 'https://provider.test/v1/images/edits',
  responsesEndpoint: 'https://provider.test/v1/responses',
  apiKey: 'test-key',
  modelId: 'image-model',
  authHeaderName: 'Authorization',
  authScheme: 'Bearer',
  timeoutMs: 5000,
  persistApiKey: false
};

async function withServer<T>(run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = http.createServer(createImageStudioApp());
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    return await run(baseUrl);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

async function waitForCondition(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error('Timed out waiting for condition.');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function readNextTasksEvent(response: Response): Promise<any> {
  assert.ok(response.body);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) throw new Error('SSE stream closed before task event.');
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        if (!block.includes('event: tasks')) continue;
        const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
        return JSON.parse(data);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function readTasksEventWithTask(response: Response, taskId: string): Promise<any> {
  assert.ok(response.body);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) throw new Error('SSE stream closed before task event.');
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      for (const block of blocks) {
        if (!block.includes('event: tasks')) continue;
        const data = block.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
        const parsed = JSON.parse(data);
        if (parsed.tasks?.some((task: any) => task.id === taskId)) return parsed;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function withMockedUpstream<T>(baseUrl: string, run: (calls: Array<{ input: RequestInfo | URL; init?: RequestInit }>) => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith(baseUrl)) return originalFetch(input, init);
    calls.push({ input, init });
    return new Response('{"data":[]}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  try {
    return await run(calls);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('provider-submit route submits JSON provider modes without using legacy generate route as truth', async () => {
  await withServer(async (baseUrl) => withMockedUpstream(baseUrl, async (calls) => {
    const response = await fetch(`${baseUrl}/api/provider/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        payload: { prompt: 'json fox', model: 'image-model' },
        providerModeId: 'openai-compatible.image-generate',
        transport: { kind: 'json', operation: 'generate', path: '/api/provider/submit' }
      })
    });

    const body = await response.text();
    assert.equal(response.status, 200, body);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].input, provider.generationEndpoint);
    assert.equal((calls[0].init?.headers as Headers).get('Content-Type'), 'application/json');
    assert.equal(JSON.parse(String(calls[0].init?.body)).prompt, 'json fox');
  }));
});

test('server-owned generation route keeps active task available to new SSE subscribers', async () => {
  resetGenerationTaskRuntimeForTests();
  const originalFetch = globalThis.fetch;
  const upstreamCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('http://127.0.0.1:')) return originalFetch(input, init);
    upstreamCalls.push({ input, init });
    return new Promise<Response>(() => undefined);
  };

  try {
    await withServer(async (baseUrl) => {
      const runResponse = await fetch(`${baseUrl}/api/generation-tasks/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          payload: { prompt: 'server owned fox', model: 'image-model' },
          providerModeId: 'openai-compatible.image-generate',
          transport: { kind: 'json', operation: 'generate', path: '/api/provider/submit' },
          snapshot: {
            createdAt: Date.now(),
            mode: 'generate',
            prompt: 'server owned fox',
            endpoint: provider.generationEndpoint,
            providerLabel: 'Test provider',
            providerAdapterId: 'openai-compatible',
            model: 'image-model',
            modelLabel: 'image-model',
            payload: { prompt: 'server owned fox', model: 'image-model' },
            warnings: [],
            attachments: [],
            params: {}
          }
        })
      });
      const body = await runResponse.json() as { taskId: string };
      assert.equal(runResponse.status, 202);
      assert.equal(typeof body.taskId, 'string');

      const controller = new AbortController();
      const eventsResponse = await fetch(`${baseUrl}/api/generation-tasks/events`, { signal: controller.signal });
      const event = await readTasksEventWithTask(eventsResponse, body.taskId);
      controller.abort();
      const task = event.tasks.find((item: any) => item.id === body.taskId);
      assert.ok(['queued', 'sending', 'running'].includes(task.status));
      assert.equal(task.request.prompt, 'server owned fox');
      assert.equal(upstreamCalls.length, 1);
    });
  } finally {
    globalThis.fetch = originalFetch;
    resetGenerationTaskRuntimeForTests();
  }
});

test('server-owned batch route keeps active batch available to new SSE subscribers', async () => {
  resetGenerationTaskRuntimeForTests();
  const originalFetch = globalThis.fetch;
  const upstreamCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('http://127.0.0.1:')) return originalFetch(input, init);
    upstreamCalls.push({ input, init });
    return new Promise<Response>(() => undefined);
  };

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/generation-tasks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intervalMs: 250,
          items: [{
            provider,
            payload: { prompt: 'server batch fox', model: 'image-model' },
            providerModeId: 'openai-compatible.image-generate',
            transport: { kind: 'json', operation: 'generate', path: '/api/provider/submit' },
            snapshot: {
              createdAt: Date.now(),
              mode: 'generate',
              prompt: 'server batch fox',
              endpoint: provider.generationEndpoint,
              providerLabel: 'Test provider',
              providerAdapterId: 'openai-compatible',
              model: 'image-model',
              modelLabel: 'image-model',
              payload: { prompt: 'server batch fox', model: 'image-model' },
              warnings: [],
              attachments: [],
              params: {}
            }
          }]
        })
      });
      const body = await response.json() as { taskId: string };
      assert.equal(response.status, 202);
      assert.equal(typeof body.taskId, 'string');

      const controller = new AbortController();
      const eventsResponse = await fetch(`${baseUrl}/api/generation-tasks/events`, { signal: controller.signal });
      const event = await readTasksEventWithTask(eventsResponse, body.taskId);
      controller.abort();
      const task = event.tasks.find((item: any) => item.id === body.taskId);
      assert.equal(task.kind, 'batch');
      assert.equal(task.batch.items.length, 1);
      assert.ok(['queued', 'sending', 'running'].includes(task.batch.items[0].status));
      assert.equal(task.batch.items[0].request.prompt, 'server batch fox');
      assert.equal(upstreamCalls.length, 1);
    });
  } finally {
    globalThis.fetch = originalFetch;
    resetGenerationTaskRuntimeForTests();
  }
});

test('server-owned batch route runs delayed items without browser window globals', async () => {
  resetGenerationTaskRuntimeForTests();
  const originalFetch = globalThis.fetch;
  const upstreamCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('http://127.0.0.1:')) return originalFetch(input, init);
    upstreamCalls.push({ input, init });
    return new Response(JSON.stringify({ data: [{ b64_json: 'AQID', output_format: 'png' }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  try {
    await withServer(async (baseUrl) => {
      const snapshot = (prompt: string) => ({
        createdAt: Date.now(),
        mode: 'generate',
        prompt,
        endpoint: provider.generationEndpoint,
        providerLabel: 'Test provider',
        providerAdapterId: 'openai-compatible',
        model: 'image-model',
        modelLabel: 'image-model',
        payload: { prompt, model: 'image-model' },
        warnings: [],
        attachments: [],
        params: {}
      });
      const response = await fetch(`${baseUrl}/api/generation-tasks/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intervalMs: 1,
          items: ['batch delayed one', 'batch delayed two'].map((prompt) => ({
            provider,
            payload: { prompt, model: 'image-model' },
            providerModeId: 'openai-compatible.image-generate',
            transport: { kind: 'json', operation: 'generate', path: '/api/provider/submit' },
            snapshot: snapshot(prompt)
          }))
        })
      });
      assert.equal(response.status, 202, await response.text());
      await waitForCondition(() => upstreamCalls.length === 2);
    });
  } finally {
    globalThis.fetch = originalFetch;
    resetGenerationTaskRuntimeForTests();
  }
});

test('server-owned task delete route removes task from SSE bootstrap', async () => {
  resetGenerationTaskRuntimeForTests();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('http://127.0.0.1:')) return originalFetch(input, init);
    return new Promise<Response>(() => undefined);
  };

  try {
    await withServer(async (baseUrl) => {
      const runResponse = await fetch(`${baseUrl}/api/generation-tasks/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          payload: { prompt: 'delete me fox', model: 'image-model' },
          providerModeId: 'openai-compatible.image-generate',
          transport: { kind: 'json', operation: 'generate', path: '/api/provider/submit' },
          snapshot: {
            createdAt: Date.now(),
            mode: 'generate',
            prompt: 'delete me fox',
            endpoint: provider.generationEndpoint,
            providerLabel: 'Test provider',
            providerAdapterId: 'openai-compatible',
            model: 'image-model',
            modelLabel: 'image-model',
            payload: { prompt: 'delete me fox', model: 'image-model' },
            warnings: [],
            attachments: [],
            params: {}
          }
        })
      });
      const body = await runResponse.json() as { taskId: string };
      assert.equal(runResponse.status, 202);

      const deleteResponse = await fetch(`${baseUrl}/api/generation-tasks/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: body.taskId })
      });
      assert.equal(deleteResponse.status, 204);

      const controller = new AbortController();
      const eventsResponse = await fetch(`${baseUrl}/api/generation-tasks/events`, { signal: controller.signal });
      const event = await readNextTasksEvent(eventsResponse);
      controller.abort();
      assert.equal(event.tasks.some((task: any) => task.id === body.taskId), false);
    });
  } finally {
    globalThis.fetch = originalFetch;
    resetGenerationTaskRuntimeForTests();
  }
});

test('provider-submit route submits multipart provider modes without using legacy edit route as truth', async () => {
  await withServer(async (baseUrl) => withMockedUpstream(baseUrl, async (calls) => {
    const form = new FormData();
    form.append('provider', JSON.stringify(provider));
    form.append('payload', JSON.stringify({ prompt: 'multipart fox', model: 'image-model' }));
    form.append('providerModeId', 'openai-compatible.image-edit');
    form.append('transport', JSON.stringify({ kind: 'multipart', operation: 'edit', path: '/api/provider/submit' }));
    form.append('image_target', new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/png' }), 'target.png');

    const response = await fetch(`${baseUrl}/api/provider/submit`, {
      method: 'POST',
      body: form
    });

    const body = await response.text();
    assert.equal(response.status, 200, body);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].input, provider.editEndpoint);
    assert.ok(calls[0].init?.body instanceof FormData);
    assert.equal((calls[0].init?.headers as Headers).get('Content-Type'), null);
  }));
});
