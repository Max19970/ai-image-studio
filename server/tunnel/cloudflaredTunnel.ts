import { spawn, spawnSync } from 'node:child_process';
import {
  firstNonEmpty,
  isTunnelAutostartEnabled,
  resolveTunnelArgs
} from './cloudflaredTunnelArgs';
import {
  bindProcessShutdown,
  cleanupCloudflaredConnector,
  createCloudflaredChildEnv,
  stopCloudflaredTunnel
} from './cloudflaredTunnelCleanup';
import { handleCloudflaredOutput } from './cloudflaredTunnelLogs';
import type {
  CloudflaredTunnelHandle,
  CloudflaredTunnelOptions,
  CloudflaredTunnelRuntimeState,
  TunnelTemplateValues
} from './cloudflaredTunnelTypes';

export type {
  CloudflaredRuntimeIds,
  CloudflaredTunnelHandle,
  CloudflaredTunnelLogger,
  CloudflaredTunnelOptions,
  TunnelTemplateValues
} from './cloudflaredTunnelTypes';

export {
  isTunnelAutostartEnabled,
  isTunnelCleanupOnStopEnabled,
  resolveTunnelArgs,
  splitCommandArgs
} from './cloudflaredTunnelArgs';

export {
  readCloudflaredRuntimeIds,
  redactCloudflaredLogLine
} from './cloudflaredTunnelLogs';

export { resolveTunnelCleanupArgs } from './cloudflaredTunnelCleanup';

export function startOptionalCloudflaredTunnel(options: CloudflaredTunnelOptions): CloudflaredTunnelHandle | null {
  const env = options.env ?? process.env;
  if (!isTunnelAutostartEnabled(env)) return null;

  const logger = options.logger ?? console;
  const command = firstNonEmpty(env.IMAGE_STUDIO_TUNNEL_COMMAND, env.IMAGE_STUDIO_CLOUDFLARED_COMMAND) ?? 'cloudflared';
  const values: TunnelTemplateValues = {
    targetUrl: options.targetUrl,
    host: env.HOST?.trim() || '127.0.0.1',
    port: env.PORT?.trim() || '8787'
  };
  const args = resolveTunnelArgs(env, values);
  const spawnFn = options.spawnProcess ?? spawn;
  const spawnCleanupFn = options.spawnCleanupProcess ?? spawnSync;
  const state: CloudflaredTunnelRuntimeState = {
    cleanupStarted: false,
    stopStarted: false
  };

  logger.log(`Starting Cloudflare Tunnel for ${options.targetUrl}…`);
  const child = spawnFn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: createCloudflaredChildEnv(env)
  });

  child.stdout?.on('data', (chunk) => handleCloudflaredOutput(state, logger, 'log', 'cloudflared', chunk));
  child.stderr?.on('data', (chunk) => handleCloudflaredOutput(state, logger, 'warn', 'cloudflared', chunk));
  child.on('error', (error) => logger.error(`Cloudflare Tunnel failed to start: ${error.message}`));
  child.on('exit', (code, signal) => {
    if (code === 0 || signal) logger.log(`Cloudflare Tunnel stopped${signal ? ` by ${signal}` : ''}.`);
    else logger.warn(`Cloudflare Tunnel exited with code ${code}.`);
    cleanupCloudflaredConnector(state, command, env, logger, spawnCleanupFn);
  });

  const stop = () => stopCloudflaredTunnel(state, child, command, env, logger, spawnCleanupFn);
  const handle: CloudflaredTunnelHandle = { child, stop };

  bindProcessShutdown(stop);
  return handle;
}
