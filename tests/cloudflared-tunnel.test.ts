import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isTunnelAutostartEnabled,
  redactCloudflaredLogLine,
  resolveTunnelArgs,
  splitCommandArgs
} from '../server/tunnel/cloudflaredTunnel';

test('server tunnel autostart flag is opt-in', () => {
  assert.equal(isTunnelAutostartEnabled({}), false);
  assert.equal(isTunnelAutostartEnabled({ IMAGE_STUDIO_TUNNEL_AUTOSTART: 'true' }), true);
  assert.equal(isTunnelAutostartEnabled({ IMAGE_STUDIO_TUNNEL_AUTOSTART: '1' }), true);
  assert.equal(isTunnelAutostartEnabled({ IMAGE_STUDIO_TUNNEL_AUTOSTART: 'false' }), false);
  assert.equal(isTunnelAutostartEnabled({ IMAGE_STUDIO_CLOUDFLARED_AUTOSTART: 'yes' }), true);
});

test('server tunnel args default to the local server target', () => {
  assert.deepEqual(
    resolveTunnelArgs({}, { targetUrl: 'http://127.0.0.1:8787', host: '127.0.0.1', port: '8787' }),
    ['tunnel', '--url', 'http://127.0.0.1:8787']
  );
});

test('server tunnel args can be customized', () => {
  assert.deepEqual(
    resolveTunnelArgs(
      { IMAGE_STUDIO_TUNNEL_ARGS: 'tunnel run "image studio"' },
      { targetUrl: 'http://127.0.0.1:8787', host: '127.0.0.1', port: '8787' }
    ),
    ['tunnel', 'run', 'image studio']
  );
});

test('command arg splitter keeps quoted values together', () => {
  assert.deepEqual(splitCommandArgs('tunnel --name "image studio"'), ['tunnel', '--name', 'image studio']);
});

test('cloudflared log redaction hides token-like values', () => {
  assert.equal(redactCloudflaredLogLine('Settings: map[token:abc123 no-autoupdate:true]'), 'Settings: map[token:***** no-autoupdate:true]');
  assert.equal(
    redactCloudflaredLogLine('Environmental variables map[IMAGE_STUDIO_TUNNEL_ARGS:tunnel run --token abc123 IMAGE_STUDIO_TUNNEL_AUTOSTART:true]'),
    'Environmental variables map[IMAGE_STUDIO_TUNNEL_ARGS:***** IMAGE_STUDIO_TUNNEL_AUTOSTART:true]'
  );
});
