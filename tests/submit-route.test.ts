import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createImageStudioApp } from '../server/app';
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
