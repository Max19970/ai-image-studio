import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearTemporaryImageDownloadsForTests,
  createTemporaryImageDownload,
  getTemporaryImageDownload,
  parseImageDataUrlForDownload,
  sanitizeDownloadFilename
} from '../server/routes/generationTaskDownloadHelpers';
import { requestTelegramMiniAppImageDownload, resolveTelegramDownloadUrl } from '../src/integrations/telegram-mini-app/downloadFile';
import type { TelegramWebAppBridge } from '../src/integrations/telegram-mini-app/telegramWebApp';

async function withMockWindow<T>(webApp: Partial<TelegramWebAppBridge>, run: () => T | Promise<T>): Promise<T> {
  const previousWindow = globalThis.window;
  (globalThis as typeof globalThis & { window: unknown }).window = {
    location: { href: 'https://studio.example/app' },
    Telegram: { WebApp: webApp }
  };
  try {
    return await run();
  } finally {
    if (previousWindow) (globalThis as typeof globalThis & { window: unknown }).window = previousWindow;
    else delete (globalThis as typeof globalThis & { window?: unknown }).window;
  }
}

test('Telegram Mini App download URL is registered through the server for stored assets', async () => {
  const previousFetch = globalThis.fetch;
  const calls: Array<{ url: string; body: unknown }> = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({
      url: 'https://studio.example/api/storage/generation-task-asset/download?key=asset&filename=result.png'
    }), { status: 200 });
  };

  try {
    const url = await withMockWindow({}, () => resolveTelegramDownloadUrl({
      href: 'data:image/png;base64,AAAA',
      filename: 'result.png',
      storageAssetKey: 'task-1/image/top/full'
    }));

    assert.equal(url, 'https://studio.example/api/storage/generation-task-asset/download?key=asset&filename=result.png');
    assert.deepEqual(calls, [{
      url: '/api/storage/generation-task-downloads',
      body: { filename: 'result.png', storageAssetKey: 'task-1/image/top/full' }
    }]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('Telegram Mini App download verifies fresh image URLs before native request', async () => {
  const previousFetch = globalThis.fetch;
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const publicUrl = 'https://studio.example/api/storage/generation-task-downloads/temp-1';
  globalThis.fetch = async (input, init) => {
    const method = init?.method ?? 'GET';
    calls.push({ url: String(input), method, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (method === 'HEAD') return new Response(null, { status: 200, headers: { 'Content-Type': 'image/png' } });
    return new Response(JSON.stringify({ url: publicUrl }), { status: 200 });
  };

  const nativeCalls: unknown[] = [];
  try {
    const handled = await withMockWindow({
      initData: '',
      version: '8.0',
      platform: 'web',
      colorScheme: 'dark',
      ready() {},
      expand() {},
      isVersionAtLeast: (version) => version === '8.0',
      downloadFile: (params) => nativeCalls.push(params)
    }, () => requestTelegramMiniAppImageDownload({
      href: 'data:image/png;base64,QUJDRA==',
      filename: 'fresh.png'
    }));

    assert.equal(handled, true);
    assert.deepEqual(calls, [
      {
        url: '/api/storage/generation-task-downloads',
        method: 'POST',
        body: { filename: 'fresh.png', src: 'data:image/png;base64,QUJDRA==' }
      },
      { url: publicUrl, method: 'HEAD', body: null }
    ]);
    assert.deepEqual(nativeCalls, [{ url: publicUrl, file_name: 'fresh.png' }]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('Telegram Mini App download refuses HTML fallback URLs before Telegram saves them', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    if (init?.method === 'HEAD') return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html' } });
    return new Response(JSON.stringify({ url: 'https://studio.example/api/storage/generation-task-downloads/temp-html' }), { status: 200 });
  };

  const nativeCalls: unknown[] = [];
  const alerts: string[] = [];
  try {
    const handled = await withMockWindow({
      initData: '',
      version: '8.0',
      platform: 'web',
      colorScheme: 'dark',
      ready() {},
      expand() {},
      downloadFile: (params) => nativeCalls.push(params),
      showAlert: (message) => alerts.push(message)
    }, () => requestTelegramMiniAppImageDownload({
      href: 'data:image/png;base64,QUJDRA==',
      filename: 'fresh.png'
    }));

    assert.equal(handled, false);
    assert.deepEqual(nativeCalls, []);
    assert.match(alerts[0], /не изображение/i);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('server download helpers parse data URLs and keep temporary images bounded by expiry', () => {
  clearTemporaryImageDownloadsForTests();
  const parsed = parseImageDataUrlForDownload('data:image/png;base64,QUJDRA==');
  assert.equal(parsed?.mediaType, 'image/png');
  assert.equal(parsed?.buffer.toString('utf8'), 'ABCD');
  assert.equal(sanitizeDownloadFilename('../bad:name', 'png'), 'bad_name.png');

  const download = createTemporaryImageDownload('data:image/webp;base64,QUJDRA==', 'арт.webp', 1000);
  assert.ok(download);
  assert.equal(getTemporaryImageDownload(download.id, 1000)?.filename, 'арт.webp');
  assert.equal(getTemporaryImageDownload(download.id, 1000 + 10 * 60 * 1000 + 1), null);
});
