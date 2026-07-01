import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { fetchOpenAiCompatibleGenerate } from '../server/providers/openai-compatible/requestHandlers';
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

test('OpenAI-compatible upstream client avoids stale keep-alive sockets on compatible proxies', async () => {
  const server = http.createServer((req, res) => {
    if (req.headers.connection !== 'close') {
      req.socket.destroy();
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end('{"data":[{"b64_json":"QUJDRA=="}]}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address === 'object');

  try {
    const { upstream } = await fetchOpenAiCompatibleGenerate({
      ...provider,
      generationEndpoint: `http://127.0.0.1:${address.port}/v1/images/generations`
    }, { prompt: 'fox', model: 'image-model' });

    assert.equal(upstream.status, 200);
    assert.deepEqual(await upstream.json(), { data: [{ b64_json: 'QUJDRA==' }] });
  } finally {
    server.close();
    await once(server, 'close');
  }
});
