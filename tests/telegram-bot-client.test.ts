import assert from 'node:assert/strict';
import test from 'node:test';
import { TelegramBotApiClient } from '../server/integrations/telegram/client';

function withMockFetch<T>(handler: typeof fetch, run: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler;
  return run().finally(() => {
    globalThis.fetch = originalFetch;
  });
}

test('TelegramBotApiClient getMe returns bot identity from Bot API result', async () => {
  await withMockFetch(async (input, init) => {
    assert.equal(String(input), 'https://api.telegram.org/botsecret-token/getMe');
    assert.deepEqual(JSON.parse(String(init?.body ?? '{}')), {});
    return new Response(JSON.stringify({
      ok: true,
      result: { id: 123, is_bot: true, first_name: 'Image Studio', username: 'image_studio_bot' }
    }));
  }, async () => {
    const client = new TelegramBotApiClient('secret-token');
    const bot = await client.getMe();
    assert.deepEqual(bot, { id: 123, is_bot: true, first_name: 'Image Studio', username: 'image_studio_bot' });
  });
});

test('TelegramBotApiClient reports Bot API errors without adding extra token copies to message', async () => {
  await withMockFetch(async () => new Response(JSON.stringify({
    ok: false,
    error_code: 401,
    description: 'Unauthorized'
  }), { status: 401 }), async () => {
    const client = new TelegramBotApiClient('secret-token');
    await assert.rejects(() => client.getMe(), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'Telegram getMe failed (401): Unauthorized');
      assert.equal(error.message.includes('secret-token'), false);
      return true;
    });
  });
});

test('TelegramBotApiClient setChatMenuButton sends Web App payload shape', async () => {
  const calls: Array<{ url: string; body: unknown }> = [];

  await withMockFetch(async (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify({ ok: true, result: true }));
  }, async () => {
    const client = new TelegramBotApiClient('secret-token');
    await client.setChatMenuButton({
      type: 'web_app',
      text: 'Open Image Studio',
      web_app: { url: 'https://studio.example/app' }
    });
  });

  assert.deepEqual(calls, [{
    url: 'https://api.telegram.org/botsecret-token/setChatMenuButton',
    body: {
      menu_button: {
        type: 'web_app',
        text: 'Open Image Studio',
        web_app: { url: 'https://studio.example/app' }
      }
    }
  }]);
});
