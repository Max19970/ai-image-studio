import { spawn, spawnSync, type ChildProcess } from 'node:child_process';

export interface CloudflaredTunnelLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface CloudflaredTunnelHandle {
  readonly child: ChildProcess;
  stop(): void;
}

export interface CloudflaredTunnelOptions {
  readonly targetUrl: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly logger?: CloudflaredTunnelLogger;
  readonly spawnProcess?: typeof spawn;
  readonly spawnCleanupProcess?: typeof spawnSync;
}

export interface TunnelTemplateValues {
  readonly targetUrl: string;
  readonly host: string;
  readonly port: string;
}

export interface CloudflaredRuntimeIds {
  readonly tunnelId?: string;
  readonly connectorId?: string;
}

interface CloudflaredTunnelRuntimeState {
  tunnelId?: string;
  connectorId?: string;
  cleanupStarted: boolean;
  stopStarted: boolean;
}

const truthyValues = new Set(['1', 'true', 'yes', 'on']);
const falseyValues = new Set(['0', 'false', 'no', 'off', '']);
const cloudflaredCleanupTimeoutMs = 15_000;

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
  const handle: CloudflaredTunnelHandle = {
    child,
    stop
  };

  bindProcessShutdown(stop);
  return handle;
}

export function isTunnelAutostartEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = firstNonEmpty(env.IMAGE_STUDIO_TUNNEL_AUTOSTART, env.IMAGE_STUDIO_CLOUDFLARED_AUTOSTART);
  if (raw === undefined) return false;
  const normalized = raw.trim().toLowerCase();
  if (truthyValues.has(normalized)) return true;
  if (falseyValues.has(normalized)) return false;
  return false;
}

export function isTunnelCleanupOnStopEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = firstNonEmpty(env.IMAGE_STUDIO_TUNNEL_CLEANUP_ON_STOP, env.IMAGE_STUDIO_CLOUDFLARED_CLEANUP_ON_STOP);
  if (raw === undefined) return true;
  const normalized = raw.trim().toLowerCase();
  if (truthyValues.has(normalized)) return true;
  if (falseyValues.has(normalized)) return false;
  return true;
}

export function resolveTunnelArgs(env: NodeJS.ProcessEnv, values: TunnelTemplateValues): string[] {
  const explicitArgs = firstNonEmpty(env.IMAGE_STUDIO_TUNNEL_ARGS, env.IMAGE_STUDIO_CLOUDFLARED_ARGS);
  if (explicitArgs) return splitCommandArgs(interpolateTunnelArgs(explicitArgs, values));
  return ['tunnel', '--url', values.targetUrl];
}

export function resolveTunnelCleanupArgs(ids: Required<CloudflaredRuntimeIds>): string[] {
  return ['tunnel', 'cleanup', '--connector-id', ids.connectorId, ids.tunnelId];
}

export function readCloudflaredRuntimeIds(line: string): CloudflaredRuntimeIds {
  return {
    tunnelId: readCloudflaredTunnelId(line),
    connectorId: readCloudflaredConnectorId(line)
  };
}

export function splitCommandArgs(source: string): string[] {
  const args: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const char of source) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if ((char === '"' || char === "'") && !quote) {
      quote = char;
      continue;
    }
    if (quote === char) {
      quote = null;
      continue;
    }
    if (!quote && /\s/.test(char)) {
      if (current) {
        args.push(current);
        current = '';
      }
      continue;
    }
    current += char;
  }

  if (escaped) current += '\\';
  if (current) args.push(current);
  return args;
}

function interpolateTunnelArgs(source: string, values: TunnelTemplateValues): string {
  return source
    .replaceAll('${IMAGE_STUDIO_TUNNEL_TARGET_URL}', values.targetUrl)
    .replaceAll('${targetUrl}', values.targetUrl)
    .replaceAll('${HOST}', values.host)
    .replaceAll('${PORT}', values.port);
}

function stopCloudflaredTunnel(
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

function stopCloudflaredChild(child: ChildProcess, logger: CloudflaredTunnelLogger): void {
  if (child.killed || child.exitCode !== null) return;
  logger.log('Stopping Cloudflare Tunnel…');
  child.kill();
}

function cleanupCloudflaredConnector(
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

function cloudflaredCleanupIds(state: CloudflaredTunnelRuntimeState): Required<CloudflaredRuntimeIds> | null {
  if (!state.tunnelId || !state.connectorId) return null;
  return {
    tunnelId: state.tunnelId,
    connectorId: state.connectorId
  };
}

function bindProcessShutdown(stop: () => void): void {
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

function handleCloudflaredOutput(
  state: CloudflaredTunnelRuntimeState,
  logger: CloudflaredTunnelLogger,
  level: keyof Pick<CloudflaredTunnelLogger, 'log' | 'warn'>,
  prefix: string,
  chunk: unknown
): void {
  String(chunk)
    .split(/\r?\n/g)
    .forEach((rawLine) => {
      updateCloudflaredRuntimeIds(state, rawLine);
      const line = redactCloudflaredLogLine(rawLine.trimEnd());
      if (line) logger[level](`[${prefix}] ${line}`);
    });
}

function updateCloudflaredRuntimeIds(state: CloudflaredTunnelRuntimeState, line: string): void {
  const ids = readCloudflaredRuntimeIds(line);
  if (ids.tunnelId) state.tunnelId = ids.tunnelId;
  if (ids.connectorId) state.connectorId = ids.connectorId;
}

function readCloudflaredTunnelId(line: string): string | undefined {
  return line.match(/\btunnelID=([a-z0-9-]+)/i)?.[1];
}

function readCloudflaredConnectorId(line: string): string | undefined {
  return line.match(/\bGenerated Connector ID:\s*([a-z0-9-]+)/i)?.[1] ?? line.match(/\bconnectorId[=:]\"?([a-z0-9-]+)/i)?.[1];
}

function logCleanupOutput(
  logger: CloudflaredTunnelLogger,
  level: keyof Pick<CloudflaredTunnelLogger, 'log' | 'warn'>,
  output: string | Buffer | null | undefined
): void {
  if (!output) return;
  String(output)
    .split(/\r?\n/g)
    .map((line) => redactCloudflaredLogLine(line.trimEnd()))
    .filter(Boolean)
    .forEach((line) => logger[level](`[cloudflared cleanup] ${line}`));
}

function createCloudflaredChildEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
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

export function redactCloudflaredLogLine(line: string): string {
  return line
    .replace(/(--token\s+)[^\s\]]+/gi, '$1*****')
    .replace(/(token:)[^\s\]]+/gi, '$1*****')
    .replace(/(TUNNEL_TOKEN:)[^\s\]]+/gi, '$1*****')
    .replace(/([A-Z0-9_]*(?:TOKEN|KEY|SECRET)[A-Z0-9_]*:)[^\s\]]+/gi, '$1*****')
    .replace(/([A-Z0-9_]*(?:TOKEN|KEY|SECRET)[A-Z0-9_]*=)[^\s\]]+/gi, '$1*****')
    .replace(/(IMAGE_STUDIO_TUNNEL_ARGS:).*?(?=\s[A-Z0-9_]+:|\]$)/g, '$1*****')
    .replace(/(IMAGE_STUDIO_CLOUDFLARED_ARGS:).*?(?=\s[A-Z0-9_]+:|\]$)/g, '$1*****');
}

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== '');
}
