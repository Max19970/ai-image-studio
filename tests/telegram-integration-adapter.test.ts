import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import type { IntegrationRuntimeConfig } from '../server/integrations';
import { createTelegramIntegrationAdapter } from '../server/integrations/telegram/adapter';
import { TelegramBotApiClient } from '../server/integrations/telegram/client';
import { validateTelegramMiniAppInitData } from '../server/integrations/telegram/miniAppAuth';
import { TelegramPollingRuntime } from '../server/integrations/telegram/runtime';
import { handleTelegramUpdate } from '../server/integrations/telegram/updateHandler';
import type { TelegramBotApiPort, TelegramUpdate } from '../server/integrations/telegram/types';
import { resolveTelegramRuntimeConfig } from '../server/integrations/telegram/types';

const runtimeConfig: IntegrationRuntimeConfig = {
  id: 'telegram',
  enabled: true,
  secrets: { botToken: 'test-token' },
  values: {
    miniAppUrl: 'https://studio.example/app',
    menuButtonText: 'Open Studio',
    startMessage: 'Hello from Image Studio',
    allowedUserIds: '1001, 1002',
    pollingIntervalMs: 500
  }
};

function withMockFetch<T>(handler: typeof fetch, run: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return run().finally(() => {
    globalThis.fetch = originalFetch;
  });
}

function createFakeTelegramClient(updates: TelegramUpdate[] = []): TelegramBotApiPort & { calls: Array<{ method: string; payload?: unknown }> } {
  const calls: Array<{ method: string; payload?: unknown }> = [];
  return {
    calls,
    getMe: async () => {
      calls.push({ method: 'getMe' });
      return { id: 42, is_bot: true, first_name: 'Image Studio', username: 'image_studio_bot' };
    },
    deleteWebhook: async () => {
      calls.push({ method: 'deleteWebhook' });
      return true;
    },
    setChatMenuButton: async (menuButton) => {
      calls.push({ method: 'setChatMenuButton', payload: menuButton });
      return true;
    },
    setMyCommands: async (commands) => {
      calls.push({ method: 'setMyCommands', payload: commands });
      return true;
    },
    sendMessage: async (chatId, text, replyMarkup) => {
      calls.push({ method: 'sendMessage', payload: { chatId, text, replyMarkup } });
      return { ok: true };
    },
    getUpdates: async () => {
      calls.push({ method: 'getUpdates' });
      return updates;
    }
  };
}

test('Telegram Bot API client calls stable Bot API methods without leaking token in errors', async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];

  await withMockFetch(async (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body ?? '{}')) });
    if (String(input).endsWith('/getMe')) {
      return new Response(JSON.stringify({ ok: true, result: { id: 7, is_bot: true, first_name: 'Studio', username: 'studio_bot' } }));
    }
    if (String(input).endsWith('/setChatMenuButton')) {
      return new Response(JSON.stringify({ ok: true, result: true }));
    }
    return new Response(JSON.stringify({ ok: false, error_code: 401, description: 'Unauthorized' }), { status: 401 });
  }, async () => {
    const client = new TelegramBotApiClient('secret-token');
    const bot = await client.getMe();
    assert.equal(bot.username, 'studio_bot');

    await client.setChatMenuButton({ type: 'web_app', text: 'Open', web_app: { url: 'https://studio.example/app' } });
    await assert.rejects(() => client.getUpdates({ timeout: 0 }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /Telegram getUpdates failed/);
      assert.equal(error.message.includes('secret-token'), false);
      return true;
    });
  });

  assert.equal(calls[0].url, 'https://api.telegram.org/botsecret-token/getMe');
  assert.equal(calls[1].url, 'https://api.telegram.org/botsecret-token/setChatMenuButton');
  assert.deepEqual(calls[1].body, {
    menu_button: { type: 'web_app', text: 'Open', web_app: { url: 'https://studio.example/app' } }
  });
});

test('Telegram adapter validates token and applies Mini App menu button through generic actions', async () => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];

  await withMockFetch(async (input, init) => {
    const method = String(input).split('/').pop() ?? '';
    calls.push({ method, payload: JSON.parse(String(init?.body ?? '{}')) });
    if (method === 'getMe') {
      return new Response(JSON.stringify({ ok: true, result: { id: 11, is_bot: true, first_name: 'Studio', username: 'studio_bot' } }));
    }
    return new Response(JSON.stringify({ ok: true, result: true }));
  }, async () => {
    const adapter = createTelegramIntegrationAdapter(new TelegramPollingRuntime(() => createFakeTelegramClient()));
    const validated = await adapter.runAction('validate-token', { config: runtimeConfig });
    assert.equal(validated.ok, true);
    assert.match(validated.message, /@studio_bot/);

    const applied = await adapter.runAction('apply-menu-button', { config: runtimeConfig });
    assert.equal(applied.ok, true);
  });

  assert.deepEqual(calls.map((call) => call.method), ['getMe', 'setChatMenuButton', 'setMyCommands']);
  assert.deepEqual(calls[1].payload, {
    menu_button: { type: 'web_app', text: 'Open Studio', web_app: { url: 'https://studio.example/app' } }
  });
});



test('Telegram adapter sends a diagnostic test message with the Mini App button', async () => {
  const calls: Array<{ method: string; payload: Record<string, unknown> }> = [];

  await withMockFetch(async (input, init) => {
    const method = String(input).split('/').pop() ?? '';
    calls.push({ method, payload: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify({ ok: true, result: { message_id: 5 } }));
  }, async () => {
    const adapter = createTelegramIntegrationAdapter(new TelegramPollingRuntime(() => createFakeTelegramClient()));
    const sent = await adapter.runAction('send-test-message', { config: runtimeConfig, payload: { chatId: '1001' } });
    assert.equal(sent.ok, true);
    assert.equal(sent.message, 'Telegram test message sent.');
  });

  assert.deepEqual(calls, [
    {
      method: 'sendMessage',
      payload: {
        chat_id: '1001',
        text: 'Hello from Image Studio',
        reply_markup: { inline_keyboard: [[{ text: 'Open Studio', web_app: { url: 'https://studio.example/app' } }]] }
      }
    }
  ]);
});

test('Telegram runtime starts polling explicitly and stops without automatic config side effects', async () => {
  const client = createFakeTelegramClient([]);
  const runtime = new TelegramPollingRuntime(() => client);

  assert.equal(runtime.getStatus().state, 'stopped');
  const started = await runtime.start(runtimeConfig);
  assert.equal(started.ok, true);
  assert.equal(runtime.getStatus().state, 'running');
  assert.deepEqual(client.calls.map((call) => call.method).slice(0, 3), ['deleteWebhook', 'getMe', 'setMyCommands']);

  const stopped = await runtime.stop();
  assert.equal(stopped.ok, true);
  assert.equal(runtime.getStatus().state, 'stopped');
});

test('/start handling sends Web App button and respects Telegram allowlist', async () => {
  const resolved = resolveTelegramRuntimeConfig(runtimeConfig);
  assert.equal(resolved.ok, true);
  assert.ok(resolved.config);

  const allowedClient = createFakeTelegramClient();
  const handled = await handleTelegramUpdate({
    update_id: 1,
    message: { message_id: 1, text: '/start', chat: { id: 2001 }, from: { id: 1001 } }
  }, resolved.config, allowedClient);
  assert.equal(handled, true);
  assert.deepEqual(allowedClient.calls.at(-1), {
    method: 'sendMessage',
    payload: {
      chatId: 2001,
      text: 'Hello from Image Studio',
      replyMarkup: { inline_keyboard: [[{ text: 'Open Studio', web_app: { url: 'https://studio.example/app' } }]] }
    }
  });

  const blockedClient = createFakeTelegramClient();
  await handleTelegramUpdate({
    update_id: 2,
    message: { message_id: 2, text: '/start', chat: { id: 2002 }, from: { id: 404 } }
  }, resolved.config, blockedClient);
  assert.deepEqual(blockedClient.calls.at(-1), {
    method: 'sendMessage',
    payload: {
      chatId: 2002,
      text: 'This Image Studio bot is restricted to allowed Telegram users.',
      replyMarkup: undefined
    }
  });
});

test('Telegram Mini App initData validation accepts signed data and rejects tampering', () => {
  const botToken = 'mini-app-token';
  const authDate = 1_800_000_000;
  const fields = new URLSearchParams({ auth_date: String(authDate), query_id: 'abc', user: '{"id":1001}' });
  const dataCheckString = [...fields.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  fields.set('hash', hash);

  const valid = validateTelegramMiniAppInitData(fields.toString(), botToken, 60, authDate + 10);
  assert.equal(valid.ok, true);
  assert.equal(valid.fields?.query_id, 'abc');

  fields.set('user', '{"id":9999}');
  const invalid = validateTelegramMiniAppInitData(fields.toString(), botToken, 60, authDate + 10);
  assert.equal(invalid.ok, false);
  assert.match(invalid.message, /invalid/);
});
