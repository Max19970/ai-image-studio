import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  getIntegrationDefinition,
  integrationDefinitions,
  isKnownIntegrationId,
  listIntegrationDefinitions,
  requireIntegrationDefinition,
  telegramIntegrationDefinition
} from '../src/entities/integrations';
import {
  integrationActionPath,
  integrationConfigPath,
  integrationsApiBasePath,
  integrationStatusPath,
  listIntegrations,
  loadIntegrationConfig,
  runIntegrationAction,
  saveIntegrationConfig,
  startIntegration,
  stopIntegration
} from '../src/infrastructure/integrations';
import {
  clearIntegrationAdaptersForTests,
  listIntegrationAdapterMetadata,
  listIntegrationAdapters,
  registerIntegrationAdapter,
  requireIntegrationAdapter,
  unregisterIntegrationAdapter
} from '../server/integrations';
import type { IntegrationRuntimeAdapter, IntegrationRuntimeStatus } from '../server/integrations';

function withMockFetch<T>(handler: typeof fetch, run: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return run().finally(() => {
    globalThis.fetch = originalFetch;
  });
}

function createServerAdapter(id = 'telegram'): IntegrationRuntimeAdapter {
  const status: IntegrationRuntimeStatus = {
    id,
    state: 'stopped',
    startedAt: null,
    updatedAt: 1
  };

  return {
    id,
    label: id === 'telegram' ? 'Телеграм' : 'Adapter',
    description: 'Test integration adapter.',
    supportsRuntime: true,
    getStatus: () => status,
    start: async () => ({ ok: true, message: 'started', status: { ...status, state: 'running' } }),
    stop: async () => ({ ok: true, message: 'stopped', status }),
    runAction: async (actionId) => ({ ok: true, message: `action:${actionId}`, status })
  };
}

test('client integration registry exposes Telegram through generic metadata only', () => {
  assert.equal(telegramIntegrationDefinition.id, 'telegram');
  assert.equal(telegramIntegrationDefinition.kind, 'messaging');
  assert.equal(telegramIntegrationDefinition.capabilities.supportsRuntime, true);
  assert.equal(telegramIntegrationDefinition.capabilities.supportsSecrets, true);
  assert.equal(telegramIntegrationDefinition.capabilities.supportsMiniApp, true);
  assert.ok(telegramIntegrationDefinition.capabilities.actions.some((action) => action.id === 'validate-token'));
  assert.ok(telegramIntegrationDefinition.capabilities.actions.some((action) => action.id === 'start-runtime'));

  assert.equal(integrationDefinitions.length, 1);
  assert.deepEqual(listIntegrationDefinitions().map((definition) => definition.id), ['telegram']);
  assert.equal(getIntegrationDefinition('telegram')?.label, 'Телеграм');
  assert.equal(isKnownIntegrationId('telegram'), true);
  assert.equal(isKnownIntegrationId('missing'), false);
  assert.throws(() => requireIntegrationDefinition('missing'), /Unknown integration/);
});

test('generic integration entity layer does not import settings UI or feature modules', () => {
  const registrySource = readFileSync(new URL('../src/entities/integrations/registry.ts', import.meta.url), 'utf8');
  const typesSource = readFileSync(new URL('../src/entities/integrations/types.ts', import.meta.url), 'utf8');
  const combined = `${registrySource}\n${typesSource}`;

  assert.doesNotMatch(combined, /features\/settings/);
  assert.doesNotMatch(combined, /TelegramIntegrationPanel/);
  assert.doesNotMatch(combined, /SettingsPage/);
  assert.doesNotMatch(combined, /provider\/registry/);
  assert.doesNotMatch(combined, /generation-params/);
});

test('integration infrastructure API keeps stable generic route shapes', async () => {
  assert.equal(integrationsApiBasePath, '/api/integrations');
  assert.equal(integrationConfigPath('telegram'), '/api/integrations/telegram/config');
  assert.equal(integrationStatusPath('telegram'), '/api/integrations/telegram/status');
  assert.equal(integrationActionPath('telegram', 'validate-token'), '/api/integrations/telegram/actions/validate-token');

  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  await withMockFetch(async (input, init) => {
    calls.push({ input, init });
    const path = String(input);
    if (path === '/api/integrations') {
      return new Response(JSON.stringify({ integrations: [telegramIntegrationDefinition] }), { status: 200 });
    }
    if (path.endsWith('/config') && init?.method === 'PUT') {
      return new Response(JSON.stringify({ definition: telegramIntegrationDefinition, config: { id: 'telegram', enabled: true, values: {}, secrets: {}, createdAt: 1, updatedAt: 2 }, status: { id: 'telegram', state: 'stopped', startedAt: null, updatedAt: 2 } }), { status: 200 });
    }
    if (path.endsWith('/config')) {
      return new Response(JSON.stringify({ definition: telegramIntegrationDefinition, config: { id: 'telegram', enabled: false, values: {}, secrets: {}, createdAt: null, updatedAt: null }, status: { id: 'telegram', state: 'stopped', startedAt: null, updatedAt: 1 } }), { status: 200 });
    }
    if (path.endsWith('/actions/start-runtime')) {
      return new Response(JSON.stringify({ ok: true, message: 'started' }), { status: 200 });
    }
    if (path.endsWith('/actions/stop-runtime')) {
      return new Response(JSON.stringify({ ok: true, message: 'stopped' }), { status: 200 });
    }
    if (path.endsWith('/actions/validate-token')) {
      return new Response(JSON.stringify({ ok: true, message: 'valid' }), { status: 200 });
    }
    return new Response('not found', { status: 404 });
  }, async () => {
    assert.equal((await listIntegrations())[0].id, 'telegram');
    assert.equal((await loadIntegrationConfig('telegram')).definition.id, 'telegram');
    assert.equal((await saveIntegrationConfig('telegram', { enabled: true })).config.enabled, true);
    assert.equal((await startIntegration('telegram')).message, 'started');
    assert.equal((await stopIntegration('telegram')).message, 'stopped');
    assert.equal((await runIntegrationAction('telegram', { actionId: 'validate-token' })).message, 'valid');
  });

  assert.equal(calls[0].input, '/api/integrations');
  assert.equal(calls[2].input, '/api/integrations/telegram/config');
  assert.equal(calls[2].init?.method, 'PUT');
  assert.equal(JSON.parse(String(calls[2].init?.body)).enabled, true);
  assert.equal(calls[3].input, '/api/integrations/telegram/actions/start-runtime');
  assert.equal(calls[3].init?.method, 'POST');
});

test('server integration registry registers adapters without route/runtime coupling', () => {
  clearIntegrationAdaptersForTests();
  const adapter = createServerAdapter('telegram');

  registerIntegrationAdapter(adapter);
  assert.equal(listIntegrationAdapters().length, 1);
  assert.equal(requireIntegrationAdapter('telegram'), adapter);
  assert.deepEqual(listIntegrationAdapterMetadata(), [
    {
      id: 'telegram',
      label: 'Телеграм',
      description: 'Test integration adapter.',
      supportsRuntime: true
    }
  ]);

  assert.throws(() => registerIntegrationAdapter(adapter), /already registered/);
  assert.throws(() => requireIntegrationAdapter('missing'), /Unknown integration adapter/);
  unregisterIntegrationAdapter('telegram');
  assert.equal(listIntegrationAdapters().length, 0);
  clearIntegrationAdaptersForTests();
});
