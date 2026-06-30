import { type ChildProcess, type spawnSync } from 'node:child_process';
import { isTunnelCleanupOnStopEnabled } from './cloudflaredTunnelArgs';
import { logCleanupOutput } from './cloudflaredTunnelLogs';
import type {
  CloudflaredRuntimeIds,
  CloudflaredTunnelLogger,
  CloudflaredTunnelRuntimeState
} from './cloudflaredTunnelTypes';

const cloudflaredCleanupTimeoutMs = 15_000;

export function resolveTunnelCleanupArgs(ids: Required<CloudflaredRuntimeIds>): string[] {
  return ['tunnel', 'cleanup', '--connector-id', ids.connectorId, ids.tunnelId];
}

export function stopCloudflaredTunnel(
  state: CloudflaredTunnelRuntimeState,
  child: ChildProcess,
  command: string,
  env: NodeJS.ProcessEnv,
  logger: CloudflaredTunnelLogger,
  spawnCleanupFn: typeof spawnSync
): void {
  if (!state.stopStarted) {
    state.stopStarted = true;
    stopCloudflaredChild(child, logger);
  }
  cleanupCloudflaredConnector(state, command, env, logger, spawnCleanupFn);
}

export function cleanupCloudflaredConnector(
  state: CloudflaredTunnelRuntimeState,
  command: string,
  env: NodeJS.ProcessEnv,
  logger: CloudflaredTunnelLogger,
  spawnCleanupFn: typeof spawnSync
): void {
  if (state.cleanupStarted || !isTunnelCleanupOnStopEnabled(env)) return;
  state.cleanupStarted = true;

  const ids = cloudflaredCleanupIds(state);
  if (!ids) {
    logger.warn('Skipping Cloudflare Tunnel connector cleanup: tunnel id or connector id is not available yet.');
    return;
  }

  logger.log(`Cleaning up Cloudflare Tunnel connector ${ids.connectorId}…`);
  const result = spawnCleanupFn(command, resolveTunnelCleanupArgs(ids), {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: createCloudflaredChildEnv(env),
    encoding: 'utf8',
    timeout: cloudflaredCleanupTimeoutMs
  });

  logCleanupOutput(logger, 'log', result.stdout);
  logCleanupOutput(logger, 'warn', result.stderr);

  if (result.error) {
    logger.warn(`Cloudflare Tunnel connector cleanup failed: ${result.error.message}`);
    return;
  }
  if (result.status !== 0) {
    logger.warn(`Cloudflare Tunnel connector cleanup exited with code ${result.status ?? 'unknown'}.`);
    return;
  }
  logger.log(`Cloudflare Tunnel connector ${ids.connectorId} cleanup requested.`);
}

export function bindProcessShutdown(stop: () => void): void {
  process.once('exit', stop);
  process.once('SIGINT', () => {
    stop();
    process.exit(130);
  });
  process.once('SIGTERM', () => {
    stop();
    process.exit(143);
  });
}

export function createCloudflaredChildEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const childEnv = { ...env };
  delete childEnv.IMAGE_STUDIO_TUNNEL_ARGS;
  delete childEnv.IMAGE_STUDIO_CLOUDFLARED_ARGS;
  delete childEnv.IMAGE_STUDIO_TUNNEL_COMMAND;
  delete childEnv.IMAGE_STUDIO_CLOUDFLARED_COMMAND;
  delete childEnv.IMAGE_STUDIO_TUNNEL_AUTOSTART;
  delete childEnv.IMAGE_STUDIO_CLOUDFLARED_AUTOSTART;
  delete childEnv.IMAGE_STUDIO_TUNNEL_CLEANUP_ON_STOP;
  delete childEnv.IMAGE_STUDIO_CLOUDFLARED_CLEANUP_ON_STOP;
  return childEnv;
}

function stopCloudflaredChild(child: ChildProcess, logger: CloudflaredTunnelLogger): void {
  if (child.killed || child.exitCode !== null) return;
  logger.log('Stopping Cloudflare Tunnel…');
  child.kill();
}

function cloudflaredCleanupIds(state: CloudflaredTunnelRuntimeState): Required<CloudflaredRuntimeIds> | null {
  if (!state.tunnelId || !state.connectorId) return null;
  return {
    tunnelId: state.tunnelId,
    connectorId: state.connectorId
  };
}
