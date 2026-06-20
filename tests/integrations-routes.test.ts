import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { IntegrationRuntimeAdapter, IntegrationRuntimeConfig, IntegrationRuntimeStatus } from '../server/integrations';

function setupStorageEnv(prefix: string) {
  const tempDir = mkdtempSync(path.join(tmpdir(), prefix));
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  return tempDir;
}

async function createStartedTestServer(adapter: IntegrationRuntimeAdapter) {
  const { createImageStudioApp } = await import(`../server/app.ts?case=${Date.now()}-${Math.random()}`);
  const integrations = await import(`../server/integrations/index.ts?case=${Date.now()}-${Math.random()}`);
  integrations.clearIntegrationAdaptersForTests();
  integrations.registerIntegrationAdapter(adapter);

  const server = http.createServer(createImageStudioApp());
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: async () => {
      integrations.clearIntegrationAdaptersForTests();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };
}

test('integration routes read/write config, run start/stop, and redact secrets', async () => {
  const tempDir = setupStorageEnv('image-studio-integrations-routes-');
  const encryptedStore = await import('../server/storage/encryptedStore.ts');
  const secretValue = '1234567890:routeStartStopSecret';
  const calls: Array<{ action: string; config: IntegrationRuntimeConfig }> = [];
  let state: IntegrationRuntimeStatus['state'] = 'stopped';

  const adapter: IntegrationRuntimeAdapter = {
    id: 'telegram',
    label: 'Телеграм',
    description: 'Route coverage adapter.',
    supportsRuntime: true,
    getStatus: () => ({ id: 'telegram', state, startedAt: null, updatedAt: 1 }),
    start: async (config) => {
      calls.push({ action: 'start', config });
      state = 'running';
      return { ok: true, message: `started ${config.secrets.botToken}`, status: { id: 'telegram', state, startedAt: 1, updatedAt: 2 } };
    },
    stop: async () => {
      state = 'stopped';
      return { ok: true, message: `stopped ${secretValue}`, status: { id: 'telegram', state, startedAt: null, updatedAt: 3 } };
    },
    runAction: async (_actionId, context) => ({ ok: true, message: String(context.config.secrets.botToken), data: context.config })
  };

  const server = await createStartedTestServer(adapter);

  try {
    const save = await fetch(`${server.baseUrl}/api/integrations/telegram/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        values: { miniAppUrl: 'https://studio.example/app', botToken: 'value-field-must-be-dropped' },
        secretPatch: { secrets: { botToken: { value: secretValue } } }
      })
    });
    assert.equal(save.status, 200);
    const savedText = await save.text();
    assert.equal(savedText.includes(secretValue), false);
    assert.equal(savedText.includes('value-field-must-be-dropped'), false);
    const savedJson = JSON.parse(savedText);
    assert.equal(savedJson.config.enabled, true);
    assert.equal(savedJson.config.values.miniAppUrl, 'https://studio.example/app');
    assert.equal(savedJson.config.values.botToken, undefined);
    assert.equal(savedJson.config.secrets.botToken.preview, '1234…cret');

    const listJson = await (await fetch(`${server.baseUrl}/api/integrations`)).json();
    assert.equal(listJson.integrations.some((item: { id: string }) => item.id === 'telegram'), true);

    const statusJson = await (await fetch(`${server.baseUrl}/api/integrations/telegram/status`)).json();
    assert.equal(statusJson.state, 'stopped');

    const startText = await (await fetch(`${server.baseUrl}/api/integrations/telegram/start`, { method: 'POST' })).text();
    assert.equal(startText.includes(secretValue), false);
    assert.equal(JSON.parse(startText).message, 'started ••••');
    assert.equal(calls[0].config.secrets.botToken, secretValue);

    const stopText = await (await fetch(`${server.baseUrl}/api/integrations/telegram/stop`, { method: 'POST' })).text();
    assert.equal(stopText.includes(secretValue), false);
    assert.equal(JSON.parse(stopText).message, 'stopped ••••');
  } finally {
    await server.close();
    encryptedStore.closeStorageDbForTests();
    rmSync(tempDir, { recursive: true, force: true });
  }
});
