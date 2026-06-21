import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { ChildProcess } from 'node:child_process';
import {
  isTunnelAutostartEnabled,
  isTunnelCleanupOnStopEnabled,
  readCloudflaredRuntimeIds,
  redactCloudflaredLogLine,
  resolveTunnelArgs,
  resolveTunnelCleanupArgs,
  splitCommandArgs,
  startOptionalCloudflaredTunnel
} from '../server/tunnel/cloudflaredTunnel';

test('server tunnel autostart flag is opt-in', () => {
  assert.equal(isTunnelAutostartEnabled({}), false);
  assert.equal(isTunnelAutostartEnabled({ IMAGE_STUDIO_TUNNEL_AUTOSTART: 'true' }), true);
  assert.equal(isTunnelAutostartEnabled({ IMAGE_STUDIO_TUNNEL_AUTOSTART: '1' }), true);
  assert.equal(isTunnelAutostartEnabled({ IMAGE_STUDIO_TUNNEL_AUTOSTART: 'false' }), false);
  assert.equal(isTunnelAutostartEnabled({ IMAGE_STUDIO_CLOUDFLARED_AUTOSTART: 'yes' }), true);
});

test('server tunnel connector cleanup is enabled by default and configurable', () => {
  assert.equal(isTunnelCleanupOnStopEnabled({}), true);
  assert.equal(isTunnelCleanupOnStopEnabled({ IMAGE_STUDIO_TUNNEL_CLEANUP_ON_STOP: 'true' }), true);
  assert.equal(isTunnelCleanupOnStopEnabled({ IMAGE_STUDIO_TUNNEL_CLEANUP_ON_STOP: 'false' }), false);
  assert.equal(isTunnelCleanupOnStopEnabled({ IMAGE_STUDIO_CLOUDFLARED_CLEANUP_ON_STOP: 'off' }), false);
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

test('server tunnel cleanup args target the stale connector record', () => {
  assert.deepEqual(
    resolveTunnelCleanupArgs({
      tunnelId: '53034f88-e6f1-46a4-90a8-cd98b0d628e5',
      connectorId: '63db7f3b-a456-4f0c-926e-be04e45420c5'
    }),
    ['tunnel', 'cleanup', '--connector-id', '63db7f3b-a456-4f0c-926e-be04e45420c5', '53034f88-e6f1-46a4-90a8-cd98b0d628e5']
  );
});

test('server tunnel runtime ids are read from cloudflared logs', () => {
  assert.deepEqual(readCloudflaredRuntimeIds('2026-06-21T10:57:31Z INF Starting tunnel tunnelID=53034f88-e6f1-46a4-90a8-cd98b0d628e5'), {
    tunnelId: '53034f88-e6f1-46a4-90a8-cd98b0d628e5',
    connectorId: undefined
  });
  assert.deepEqual(readCloudflaredRuntimeIds('2026-06-21T10:57:31Z INF Generated Connector ID: e7bcb14e-452b-46a6-92c3-1e1996344840'), {
    tunnelId: undefined,
    connectorId: 'e7bcb14e-452b-46a6-92c3-1e1996344840'
  });
});

test('server tunnel stop kills cloudflared and cleans the registered connector', () => {
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  const child = new EventEmitter() as ChildProcess & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    exitCode: number | null;
    kill(): boolean;
  };
  child.stdout = stdout;
  child.stderr = stderr;
  child.killed = false;
  child.exitCode = null;
  child.kill = () => {
    child.killed = true;
    return true;
  };

  const cleanupCalls: Array<{ command: string; args: readonly string[] }> = [];
  const logs: string[] = [];
  const logger = {
    log: (message: string) => logs.push(message),
    warn: (message: string) => logs.push(message),
    error: (message: string) => logs.push(message)
  };
  const spawnProcess = ((command: string, args: readonly string[]) => {
    assert.equal(command, 'cloudflared');
    assert.deepEqual(args, ['tunnel', '--url', 'http://127.0.0.1:8787']);
    return child;
  }) as any;
  const spawnCleanupProcess = ((command: string, args: readonly string[]) => {
    cleanupCalls.push({ command, args });
    return { status: 0, stdout: '', stderr: '' };
  }) as any;

  const handle = startOptionalCloudflaredTunnel({
    targetUrl: 'http://127.0.0.1:8787',
    env: { IMAGE_STUDIO_TUNNEL_AUTOSTART: 'true' },
    logger,
    spawnProcess,
    spawnCleanupProcess
  });

  stdout.emit('data', '2026-06-21T10:57:31Z INF Starting tunnel tunnelID=53034f88-e6f1-46a4-90a8-cd98b0d628e5\n');
  stdout.emit('data', '2026-06-21T10:57:31Z INF Generated Connector ID: e7bcb14e-452b-46a6-92c3-1e1996344840\n');
  handle?.stop();

  assert.equal(child.killed, true);
  assert.deepEqual(cleanupCalls, [
    {
      command: 'cloudflared',
      args: ['tunnel', 'cleanup', '--connector-id', 'e7bcb14e-452b-46a6-92c3-1e1996344840', '53034f88-e6f1-46a4-90a8-cd98b0d628e5']
    }
  ]);
  assert.equal(logs.some((line) => line.includes('Cleaning up Cloudflare Tunnel connector')), true);
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
  assert.equal(
    redactCloudflaredLogLine('Environmental variables map[OPENAI_MCP_TUNNEL_API_KEY:sk-secret-value NORMAL:value]'),
    'Environmental variables map[OPENAI_MCP_TUNNEL_API_KEY:***** NORMAL:value]'
  );
});
