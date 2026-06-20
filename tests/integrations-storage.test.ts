import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import type { IntegrationRuntimeAdapter, IntegrationRuntimeConfig, IntegrationRuntimeStatus } from '../server/integrations';

function setupStorageEnv(prefix: string) {
  const tempDir = mkdtempSync(path.join(tmpdir(), prefix));
  process.env.IMAGE_STUDIO_DB_PATH = path.join(tempDir, 'storage.sqlite');
  process.env.IMAGE_STUDIO_STORAGE_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  return tempDir;
}

test('integration settings store keeps secrets server-side and returns only public metadata', async () => {
  const tempDir = setupStorageEnv('image-studio-integrations-storage-');
  const encryptedStore = await import('../server/storage/encryptedStore.ts');
  const store = await import(`../server/storage/integrationSettingsStore.ts?case=${Date.now()}`);
  const appStore = await import(`../server/storage/appDocumentStore.ts?case=${Date.now()}`);
  const secretValue = '1234567890:abcDEFghijklmn';

  try {
    assert.equal(appStore.integrationSettingsBucket, 'integration-settings.v1');

    const saved = store.patchIntegrationSettings(
      'telegram',
      {
        enabled: true,
        values: {
          miniAppUrl: 'https://example.test/app',
          botToken: 'must-not-be-public',
          nested: { ok: true, secret: 'must-not-be-public-either' }
        },
        secretPatch: { secrets: { botToken: { value: secretValue } } }
      },
      ['botToken']
    );

    assert.equal(saved.record.enabled, true);
    assert.equal(saved.storage.bucket, 'integration-settings.v1');

    const loaded = store.loadIntegrationSettings().value;
    const publicConfig = store.sanitizeIntegrationSettingsForClient('telegram', loaded, ['botToken']);
    const serializedPublicConfig = JSON.stringify(publicConfig);

    assert.equal(publicConfig.enabled, true);
    assert.equal(publicConfig.values.miniAppUrl, 'https://example.test/app');
    assert.equal('botToken' in publicConfig.values, false);
    assert.deepEqual(publicConfig.values.nested, { ok: true });
    assert.equal(publicConfig.secrets.botToken.configured, true);
    assert.equal(publicConfig.secrets.botToken.preview, '1234…klmn');
    assert.equal(serializedPublicConfig.includes(secretValue), false);
    assert.equal(serializedPublicConfig.includes('must-not-be-public'), false);

    const runtimeConfig = store.loadIntegrationRuntimeConfig('telegram');
    assert.equal(runtimeConfig.secrets.botToken, secretValue);

    store.patchIntegrationSettings('telegram', { secretPatch: { secrets: { botToken: { value: '' } } } }, ['botToken']);
    assert.equal(store.loadIntegrationRuntimeConfig('telegram').secrets.botToken, secretValue);

    store.patchIntegrationSettings('telegram', { secretPatch: { secrets: { botToken: { clear: true } } } }, ['botToken']);
    const clearedPublicConfig = store.sanitizeIntegrationSettingsForClient('telegram', store.loadIntegrationSettings().value, ['botToken']);
    assert.equal(clearedPublicConfig.secrets.botToken.configured, false);
    assert.equal(store.loadIntegrationRuntimeConfig('telegram').secrets.botToken, undefined);
  } finally {
    encryptedStore.closeStorageDbForTests();
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('integration routes never echo raw stored secrets to client responses', async () => {
  const tempDir = setupStorageEnv('image-studio-integrations-routes-');
  const secretValue = '9876543210:routeSecretValue';
  let adapterConfig: IntegrationRuntimeConfig | null = null;

  const encryptedStore = await import('../server/storage/encryptedStore.ts');
  const { createImageStudioApp } = await import(`../server/app.ts?case=${Date.now()}`);
  const integrations = await import(`../server/integrations/index.ts?case=${Date.now()}`);

  const status: IntegrationRuntimeStatus = {
    id: 'telegram',
    state: 'stopped',
    startedAt: null,
    updatedAt: 1
  };

  const adapter: IntegrationRuntimeAdapter = {
    id: 'telegram',
    label: 'Телеграм',
    description: 'Route test adapter.',
    supportsRuntime: true,
    getStatus: () => status,
    start: async (config) => {
      adapterConfig = config;
      return { ok: true, message: `started:${config.secrets.botToken}`, status };
    },
    stop: async () => ({ ok: true, message: 'stopped', status }),
    runAction: async (_actionId, context) => {
      adapterConfig = context.config;
      return {
        ok: true,
        message: `validated ${context.config.secrets.botToken}`,
        status,
        data: { botToken: context.config.secrets.botToken, nested: { echoed: context.config.secrets.botToken } }
      };
    }
  };

  integrations.clearIntegrationAdaptersForTests();
  integrations.registerIntegrationAdapter(adapter);

  const server = http.createServer(createImageStudioApp());
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const saveResponse = await fetch(`${baseUrl}/api/integrations/telegram/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        values: { miniAppUrl: 'https://example.test/app' },
        secretPatch: { secrets: { botToken: { value: secretValue } } }
      })
    });
    assert.equal(saveResponse.status, 200);
    const saveText = await saveResponse.text();
    assert.equal(saveText.includes(secretValue), false);
    const saveJson = JSON.parse(saveText);
    assert.equal(saveJson.config.secrets.botToken.configured, true);
    assert.equal(saveJson.config.secrets.botToken.preview, '9876…alue');

    const getText = await (await fetch(`${baseUrl}/api/integrations/telegram/config`)).text();
    assert.equal(getText.includes(secretValue), false);

    const actionText = await (await fetch(`${baseUrl}/api/integrations/telegram/actions/validate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: {} })
    })).text();
    assert.equal(adapterConfig?.secrets.botToken, secretValue);
    assert.equal(actionText.includes(secretValue), false);
    const actionJson = JSON.parse(actionText);
    assert.equal(actionJson.message, 'validated ••••');
    assert.equal(actionJson.data.botToken, '••••');
    assert.equal(actionJson.data.nested.echoed, '••••');
  } finally {
    integrations.clearIntegrationAdaptersForTests();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    encryptedStore.closeStorageDbForTests();
    rmSync(tempDir, { recursive: true, force: true });
  }
});
