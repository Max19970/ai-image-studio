import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { telegramMiniAppValidatePath, validateTelegramMiniAppSession } from '../src/integrations/telegram-mini-app/auth';
import { readTelegramTheme, readTelegramViewport, type TelegramWebAppBridge } from '../src/integrations/telegram-mini-app/telegramWebApp';

test('Telegram Mini App bridge reads theme and safe-area viewport without trusting unsafe data', () => {
  const bridge = {
    initData: 'auth_date=1&hash=abc',
    version: '8.0',
    platform: 'android',
    colorScheme: 'dark',
    viewportHeight: 640,
    viewportStableHeight: 620,
    safeAreaInset: { top: 12, right: 3, bottom: 8, left: 4 },
    contentSafeAreaInset: { top: 0, right: 0, bottom: 24, left: 0 },
    themeParams: {
      bg_color: '#111111',
      text_color: '#eeeeee',
      secondary_bg_color: '#222222',
      bottom_bar_bg_color: '#333333'
    },
    ready() {},
    expand() {}
  } satisfies TelegramWebAppBridge;

  assert.deepEqual(readTelegramTheme(bridge), {
    colorScheme: 'dark',
    backgroundColor: '#111111',
    textColor: '#eeeeee',
    secondaryBackgroundColor: '#222222',
    buttonColor: undefined,
    buttonTextColor: undefined,
    headerBackgroundColor: undefined,
    bottomBarBackgroundColor: '#333333'
  });
  assert.deepEqual(readTelegramViewport(bridge), {
    height: 640,
    stableHeight: 620,
    safeAreaInset: { top: 12, right: 3, bottom: 8, left: 4 },
    contentSafeAreaInset: { top: 0, right: 0, bottom: 24, left: 0 }
  });
});

test('Telegram Mini App auth client posts only initData to the validation endpoint', async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body ?? '{}')) });
    return new Response(JSON.stringify({ ok: true, message: 'valid', user: { id: 1001, firstName: 'Max' }, authDate: 1800000000 }));
  };

  try {
    const result = await validateTelegramMiniAppSession('auth_date=1&hash=abc');
    assert.equal(result.ok, true);
    assert.equal(result.user?.id, 1001);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.deepEqual(calls, [{ url: telegramMiniAppValidatePath, body: { initData: 'auth_date=1&hash=abc' } }]);
});

test('Telegram Mini App runtime is isolated from regular workspace flows', () => {
  const appSource = readFileSync(new URL('../src/app/App.tsx', import.meta.url), 'utf8');
  const hookSource = readFileSync(new URL('../src/integrations/telegram-mini-app/useTelegramMiniApp.ts', import.meta.url), 'utf8');
  const bridgeSource = readFileSync(new URL('../src/integrations/telegram-mini-app/telegramWebApp.ts', import.meta.url), 'utf8');
  const routeSource = readFileSync(new URL('../server/routes/telegramMiniAppRoutes.ts', import.meta.url), 'utf8');
  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const integrationSources = `${hookSource}\n${bridgeSource}`;

  assert.match(appSource, /useHostEnvironment/);
  assert.match(hookSource, /webApp\.ready\(\)/);
  assert.match(hookSource, /webApp\.expand\(\)/);
  assert.match(hookSource, /validateTelegramMiniAppSession\(webApp\.initData\)/);
  assert.doesNotMatch(integrationSources, /initDataUnsafe/);
  assert.match(bridgeSource, /safeAreaInset/);
  assert.match(bridgeSource, /contentSafeAreaInset/);
  assert.match(routeSource, /\/api\/integrations\/telegram\/mini-app\/validate/);
  assert.match(routeSource, /validateTelegramMiniAppInitData/);
  assert.match(indexHtml, /telegram\.org\/js\/telegram-web-app\.js/);
  assert.match(indexHtml, /notifyTelegramReady/);
  assert.match(indexHtml, /webApp\.ready\(\)/);
});
